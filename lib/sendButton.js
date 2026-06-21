export default function sendButton(socket, baileys) {
    const {
        proto,
        prepareWAMessageMedia,
        generateWAMessageFromContent
    } = baileys

    return async function (jid, content = {}, options = {}) {
        if (!socket.user?.id) {
            throw new Error("User not authenticated")
        }

        const {
            text = "",
            caption = "",
            title = "",
            footer = "",
            buttons = [],
            hasMediaAttachment = false,
            image = null,
            video = null,
            document = null,
            fileName = null,
            mimetype = null,
            location = null,
            product = null,
            businessOwnerJid = null,
            contextInfo = {},
            bottom_sheet = false,
            bottom_name = "",
            limited_time_offer_text = "",
            limited_time_offer = false,
            mentionedJid = []
        } = content

        if (!Array.isArray(buttons) || buttons.length === 0) {
            throw new Error("buttons must be a non-empty array")
        }

        const processedButtons = []
        let isListMsg = false
        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i]
            if (btn?.name === "single_select") isListMsg = true
            if (!btn || typeof btn !== "object") {
                throw new Error(`interactiveButton[${i}] must be an object`)
            }

            if (btn.name && btn.buttonParamsJson) {
                processedButtons.push(btn)
                continue
            }

            if (btn.id || btn.text || btn.displayText) {
                processedButtons.push({
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text || btn.displayText || `Button ${i + 1}`,
                        id: btn.id || `quick_${i + 1}`,
                    }),
                })
                continue
            }

            if (btn.buttonId && btn.buttonText?.displayText) {
                processedButtons.push({
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.buttonText.displayText,
                        id: btn.buttonId,
                    }),
                })
                continue
            }
            throw new Error(`interactiveButton[${i}] has invalid shape`)
        }

        let messageContent = {}

        if (image) {
            const mediaInput = {}
            if (Buffer.isBuffer(image)) {
                mediaInput.image = image
            } else if (typeof image === "object" && image.url) {
                mediaInput.image = {
                    url: image.url
                }
            } else if (typeof image === "string") {
                mediaInput.image = {
                    url: image
                }
            }

            const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                upload: socket.waUploadToServer,
            })

            messageContent.header = {
                title: title || "",
                hasMediaAttachment: hasMediaAttachment || true,
                imageMessage: preparedMedia.imageMessage,
            }
        } else if (video) {
            const mediaInput = {}
            if (Buffer.isBuffer(video)) {
                mediaInput.video = video
            } else if (typeof video === "object" && video.url) {
                mediaInput.video = {
                    url: video.url
                }
            } else if (typeof video === "string") {
                mediaInput.video = {
                    url: video
                }
            }

            const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                upload: socket.waUploadToServer,
            })

            messageContent.header = {
                title: title || "",
                hasMediaAttachment: hasMediaAttachment || true,
                videoMessage: preparedMedia.videoMessage,
            }
        } else if (document) {
            if (!fileName) throw new Error("fileName requiered")
            if (!mimetype) throw new Error("mimetype requiered")
            const mediaInput = {
                document: document,
                fileName: fileName,
                mimetype: mimetype
            }
            const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                upload: socket.waUploadToServer,
            })

            messageContent.header = {
                title: title || "",
                hasMediaAttachment: true,
                documentMessage: preparedMedia.documentMessage,
            }
        } else if (location && typeof location === "object") {
            messageContent.header = {
                title: title || location.name || "Location",
                hasMediaAttachment: hasMediaAttachment || false,
                locationMessage: {
                    degreesLatitude: location.degressLatitude || location.degreesLatitude || 0,
                    degreesLongitude: location.degressLongitude || location.degreesLongitude || 0,
                    name: location.name || "",
                    address: location.address || "",
                },
            }
        } else if (product && typeof product === "object") {
            let productImageMessage = null
            if (product.productImage) {
                const mediaInput = {}
                if (Buffer.isBuffer(product.productImage)) {
                    mediaInput.image = product.productImage
                } else if (
                    typeof product.productImage === "object" &&
                    product.productImage.url
                ) {
                    mediaInput.image = {
                        url: product.productImage.url,
                    }
                } else if (typeof product.productImage === "string") {
                    mediaInput.image = {
                        url: product.productImage,
                    }
                }

                const preparedMedia = await prepareWAMessageMedia(mediaInput, {
                    upload: socket.waUploadToServer,
                })
                productImageMessage = preparedMedia.imageMessage
            }

            messageContent.header = {
                title: title || product.title || "Product",
                hasMediaAttachment: hasMediaAttachment || false,
                productMessage: {
                    product: {
                        productImage: productImageMessage,
                        productId: product.productId || "",
                        title: product.title || "",
                        description: product.description || "",
                        currencyCode: product.currencyCode || "USD",
                        priceAmount1000: parseInt(product.priceAmount1000) || 0,
                        retailerId: product.retailerId || "",
                        url: product.url || "",
                        productImageCount: product.productImageCount || 1,
                    },
                    businessOwnerJid: businessOwnerJid || product.businessOwnerJid || socket.user.id,
                },
            }
        } else if (title) {
            messageContent.header = {
                title: title,
                hasMediaAttachment: false,
            }
        }

        const hasMedia = !!(image || video || document || location || product)
        const bodyText = hasMedia ? caption : text || caption

        if (bodyText) {
            messageContent.body = {
                text: bodyText
            }
        }

        if (footer) {
            messageContent.footer = {
                text: footer
            }
        }

        messageContent.nativeFlowMessage = {
            buttons: processedButtons,
        }
        const params = {}

        if (bottom_sheet) {
            params.bottom_sheet = {
                in_thread_buttons_limit: 1,
                divider_indices: [1, 2],
                list_title: bottom_name,
                button_title: bottom_name
            }
        }
        if (limited_time_offer) {
            params.limited_time_offer = {
                text: limited_time_offer_text || "",
                url: '',
                copy_code: '',
                expiration_time: Date.now() + (1000 * 60 * 60 * 24 * 7)
            }
        }
        messageContent.nativeFlowMessage.messageParamsJson = JSON.stringify(params)
        messageContent.contextInfo = {
            mentionedJid: [
                ...(mentionedJid || []),
                ...(options.mentionedJid || [])
            ]
        }
        if (contextInfo.externalAdReply && typeof contextInfo.externalAdReply === "object") {
            messageContent.contextInfo = {
                mentionedJid: contextInfo.mentionedJid ? contextInfo.mentionedJid : mentionedJid ? mentionedJid : [],
                externalAdReply: {
                    title: contextInfo.externalAdReply.title || "",
                    body: contextInfo.externalAdReply.body || "",
                    mediaType: contextInfo.externalAdReply.mediaType || 1,
                    sourceUrl: contextInfo.externalAdReply.sourceUrl || contextInfo.externalAdReply.url || "",
                    thumbnailUrl: contextInfo.externalAdReply.thumbnailUrl || "",
                    renderLargerThumbnail: contextInfo.externalAdReply.renderLargerThumbnail || false,
                    showAdAttribution: contextInfo.externalAdReply.showAdAttribution || false,
                    containsAutoReply: contextInfo.externalAdReply.containsAutoReply || false,
                    ...(contextInfo.externalAdReply.mediaUrl && {
                        mediaUrl: contextInfo.externalAdReply.mediaUrl,
                    }),
                    ...(contextInfo.externalAdReply.thumbnail &&
                        Buffer.isBuffer(contextInfo.externalAdReply.thumbnail) && {
                        thumbnail: contextInfo.externalAdReply.thumbnail,
                    }),
                    ...(contextInfo.externalAdReply.jpegThumbnail && {
                        jpegThumbnail: contextInfo.externalAdReply.jpegThumbnail,
                    }),
                },
                ...(options.mentionedJid && {
                    mentionedJid: options.mentionedJid,
                }),
            }
        }

        const payload = proto.Message.InteractiveMessage.create(messageContent)

        const msg = generateWAMessageFromContent(
            jid, {
            interactiveMessage: payload,
        }, {
            userJid: socket.user.id,
            quoted: options?.quoted || null,
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
                    content: isListMsg ? [{
                        tag: "list",
                        attrs: {
                            type: "product_list",
                            v: "2"
                        }
                    }] : []
                },],
            },],
        }]
        await socket.relayMessage(jid, msg.message, {
            messageId: msg.key.id,
            additionalNodes,
        })
        return msg
    }
}