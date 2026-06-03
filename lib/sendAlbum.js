import crypto from "node:crypto"

export default function sendAlbum(socket, baileys) {
    const {
        generateWAMessage,
        generateWAMessageFromContent
    } = baileys

    return async function (jid, items = [], options = {}) {
        if (!socket.user?.id) throw new Error("User not authenticated")
        const messageSecret = new Uint8Array(32)
        crypto.getRandomValues(messageSecret)
        const messageContent = {
            messageContextInfo: { messageSecret },
            albumMessage: {
                expectedImageCount: items.filter((a) => a?.image).length,
                expectedVideoCount: items.filter((a) => a?.video).length,
            },
        }
        const generationOptions = {
            userJid: socket.user.id,
            upload: socket.waUploadToServer,
            quoted: options?.quoted || null,
            ephemeralExpiration: options?.quoted?.expiration ?? 0,
        }
        const album = generateWAMessageFromContent(jid, messageContent, generationOptions)
        await socket.relayMessage(album.key.remoteJid, album.message, {
            messageId: album.key.id,
        })
        await Promise.all(
            items.map(async (content) => {
                const mediaSecret = new Uint8Array(32)
                crypto.getRandomValues(mediaSecret)
                const mediaMsg = await generateWAMessage(album.key.remoteJid, content, {
                    upload: socket.waUploadToServer,
                    ephemeralExpiration: options?.quoted?.expiration ?? 0,
                })
                mediaMsg.message.messageContextInfo = {
                    messageSecret: mediaSecret,
                    messageAssociation: {
                        associationType: 1,
                        parentMessageKey: album.key,
                    },
                }
                return socket.relayMessage(
                    mediaMsg.key.remoteJid,
                    mediaMsg.message, {
                    messageId: mediaMsg.key.id,
                })
            })
        )
        return album
    }
}