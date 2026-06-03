export default function getLidFromPN(socket) {
    return async function (m, jidInput) {
        if (!jidInput) throw new Error("Misssing jid input")
        try {
            let chat = m.chat
            if (chat.endsWith('@g.us')) {
                const metadata = await socket.groupMetadata(chat)
                if (!metadata || !metadata.participants) return jidInput

                const found = metadata.participants.find(entry => entry.phoneNumber === jidInput)
                return found ? found.id : jidInput
            } else {
                const {
                    remoteJid,
                    remoteJidAlt
                } = m.key
                if (!remoteJid || !remoteJidAlt) return null
                if (remoteJidAlt === jidInput && remoteJid.endsWith("@lid")) {
                    return remoteJid
                }
            }
        } catch (e) {
            console.error('Gagal ambil group metadata:', e.message)
            return jidInput
        }
    }
}