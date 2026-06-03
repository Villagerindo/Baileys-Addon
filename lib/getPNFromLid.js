export default function getPNFromLid(socket) {
    return async function (m, lidInput) {
        if (!lidInput) throw new Error("Misssing input")
        try {
            let chat = m.chat
            if (chat.endsWith('@g.us')) {

                const metadata = await socket.groupMetadata(chat)
                if (!metadata || !metadata.participants) return lidInput

                const found = metadata.participants.find(entry => entry.id === lidInput)
                return found ? found.phoneNumber : lidInput
            } else {
                const {
                    remoteJid,
                    remoteJidAlt
                } = m.key
                if (remoteJid === lidInput && remoteJidAlt.endsWith("@s.whatsapp.net")) {
                    return remoteJidAlt
                }
            }
        } catch (e) {
            console.error('Gagal ambil group metadata:', e.message)
            return lidInput
        }
    }
}