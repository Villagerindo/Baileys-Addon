export default function sendCard(socket, baileys) {
    const {
        proto,
        generateWAMessageFromContent,
        prepareWAMessageMedia
    } = baileys

    return async function (jid, options = {}) {
        const {
            text = " ",
            footer = "",
            cards = [],
            quoted = null,
            sender = jid
        } = options

        if (!cards.length) throw new Error("cards cannot be empty")

        let carouselCards = []
        const getImageMedia = async (image) => {
            if (!image) throw new Error("Image cannot be empty")

            if (typeof image === "string") {
                return await prepareWAMessageMedia({ image: { url: image } }, {
                    upload: socket.waUploadToServer
                })
            }

            if (Buffer.isBuffer(image)) {
                return await prepareWAMessageMedia({ image }, {
                    upload: socket.waUploadToServer
                })
            }

            if (typeof image === "object") {
                return await prepareWAMessageMedia({ image }, {
                    upload: socket.waUploadToServer
                })
            }

            throw new Error("Format image tidak didukung")
        }

        for (let i = 0; i < cards.length; i++) {
            const item = cards[i]

            let img = await getImageMedia(item.image)
            if (img.imageMessage) {
                img.imageMessage.caption = item.caption || `Card ${i + 1}`
            }

            carouselCards.push({
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    ...img,
                    title: item.caption || `Card ${i + 1}`,
                    hasMediaAttachment: true
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons: Array.isArray(item.buttons) ? item.buttons : []
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                    text: footer
                })
            })
        }
        const msg = await generateWAMessageFromContent(
            jid, {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.fromObject({
                            text
                        }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                            cards: carouselCards
                        })
                    })
                
            
        }, {
            userJid: sender,
            quoted
        }
        )
        const additionalNodes = [{
            tag: "biz",
            attrs: {},
            content: [{
                tag: "interactive",
                attrs: {
                    type: "native_flow",
                    v: "1",
                },
                content: [{
                    tag: "native_flow",
                    attrs: {
                        v: "9",
                        name: "mixed",
                    },
                },],
            },],
        }]
        return await socket.relayMessage(jid, msg.message, {
            messageId: msg.key.id,
            additionalNodes
        })
    }
}
