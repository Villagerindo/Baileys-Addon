import fetch from "node-fetch"

export default function sendOrder(socket, baileys) {
    const {
        proto,
        generateMessageID,
        generateWAMessageFromContent
    } = baileys

    return async function (jid, orderData, options = {}) {
        if (!socket.user?.id) throw new Error("User not authenticated")
        let thumbnail = null
        if (orderData.thumbnail) {
            if (Buffer.isBuffer(orderData.thumbnail)) {
                thumbnail = orderData.thumbnail
            } else if (typeof orderData.thumbnail === "string") {
                try {
                    if (orderData.thumbnail.startsWith("http")) {
                        const response = await fetch(orderData.thumbnail)
                        const arrayBuffer = await response.arrayBuffer()
                        thumbnail = Buffer.from(arrayBuffer)
                    } else {
                        thumbnail = Buffer.from(orderData.thumbnail, "base64")
                    }
                } catch (e) {
                    socket.logger?.warn({ err: e.message }, "Failed to fetch/convert thumbnail")
                    thumbnail = null
                }
            }
        }

        const orderMessage = proto.Message.OrderMessage.fromObject({
            orderId: orderData.orderId || generateMessageID(),
            thumbnail: thumbnail,
            itemCount: orderData.itemCount || 1,
            status: orderData.status || proto.Message.OrderMessage.OrderStatus.INQUIRY,
            surface: orderData.surface || proto.Message.OrderMessage.OrderSurface.CATALOG,
            message: orderData.message || "",
            orderTitle: orderData.orderTitle || "Order",
            sellerJid: orderData.sellerJid || socket.user.id,
            token: orderData.token || "",
            totalAmount1000: orderData.totalAmount1000 || 0,
            totalCurrencyCode: orderData.totalCurrencyCode || "IDR",
            contextInfo: {
                ...(options.contextInfo || {}),
                ...(options.mentions ? {
                    mentionedJid: options.mentions,
                } : {}),
            },
        })
        const msg = proto.Message.create({
            orderMessage,
        })
        const message = generateWAMessageFromContent(jid, msg, {
            userJid: socket.user.id,
            timestamp: options.timestamp || new Date(),
            quoted: options.quoted || null,
            ephemeralExpiration: options.ephemeralExpiration || 0,
            messageId: options.messageId || null,
        })
        return await socket.relayMessage(message.key.remoteJid, message.message, {
            messageId: message.key.id,
        })
    }
}