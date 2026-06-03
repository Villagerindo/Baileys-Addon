import methods from "./lib/index.js"

/**
 * @param {import('baileys').WASocket} socket
 * @param {import('baileys')} baileys
 */
export default function addProperty(socket, baileys) {
    for (const [name, factory] of Object.entries(methods)) {
        socket[name] = factory(socket, baileys)
    }
    return socket
}