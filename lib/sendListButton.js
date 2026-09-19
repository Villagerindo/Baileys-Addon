export default function sendListButton(socket, baileys) {
    const {
        proto,
        prepareWAMessageMedia,
        generateWAMessageFromContent
    } = baileys;

    return async function (jid, content = {}, options = {}) {
        if (!socket.user?.id) {
            throw new Error("User not authenticated");
        }

        const {
            title = "",
            text = "",
            footer = "",
            buttonText = "Pilih Opsi", 
            sections = [],             
            image = null, // Opsional: gambar di header
            buttons = [], // Opsional: tombol quick_reply tambahan
            contextInfo = {},
            mentionedJid = []
        } = content;

        if (!Array.isArray(sections) || sections.length === 0) {
            throw new Error("sections must be a non-empty array");
        }

        const processedSections = sections.map((section, sIndex) => {
            if (!section.title) section.title = `Seksi ${sIndex + 1}`;
            if (!Array.isArray(section.rows) || section.rows.length === 0) {
                throw new Error(`Section "${section.title}" must have at least one row`);
            }

            const processedRows = section.rows.map((row, rIndex) => ({
                header: row.header || "",
                title: row.title || `Opsi ${rIndex + 1}`,
                description: row.description || "",
                id: row.id || `row_${sIndex}_${rIndex}`
            }));

            return {
                title: section.title,
                highlight_label: section.highlight_label || "",
                rows: processedRows
            };
        });

        const processedButtons = [];
        if (Array.isArray(buttons)) {
            for (let i = 0; i < buttons.length; i++) {
                const btn = buttons[i];
                if (btn && typeof btn === "object") {
                    if (btn.name && btn.buttonParamsJson) {
                        processedButtons.push(btn);
                    } else if (btn.id || btn.text || btn.displayText) {
                        processedButtons.push({
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: btn.text || btn.displayText || `Button ${i + 1}`,
                                id: btn.id || `quick_${i + 1}`,
                            }),
                        });
                    }
                }
            }
        }
      
        processedButtons.unshift({
            name: "single_select",
            buttonParamsJson: JSON.stringify({
                title: buttonText,
                sections: processedSections
            })
        });

        let headerObj = null;
        if (image) {
            const mediaInput = Buffer.isBuffer(image) ? { image } : { image: { url: typeof image === 'string' ? image : image.url } };
            const preparedMedia = await prepareWAMessageMedia(mediaInput, { upload: socket.waUploadToServer });
            headerObj = { 
                title: title || "", 
                hasMediaAttachment: true, 
                imageMessage: preparedMedia.imageMessage 
            };
        } else if (title) {
            headerObj = { 
                title: title, 
                hasMediaAttachment: false 
            };
        }

        const nativeFlowObj = {
            buttons: processedButtons,
            messageParamsJson: JSON.stringify({})
        };

        const card = {};
        if (headerObj) card.header = proto.Message.InteractiveMessage.Header.create(headerObj);
        if (text) card.body = proto.Message.InteractiveMessage.Body.create({ text });
        card.nativeFlowMessage = proto.Message.InteractiveMessage.NativeFlowMessage.create(nativeFlowObj);
        if (footer) card.footer = proto.Message.InteractiveMessage.Footer.create({ text: footer });

        const interactivePayload = {
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({
                cards: [card]
            })
        };

        if (text) {
            interactivePayload.body = proto.Message.InteractiveMessage.Body.create({ text });
        }

        let finalContextInfo = {
            mentionedJid: [
                ...(mentionedJid || []),
                ...(options.mentionedJid || [])
            ]
        };

        if (contextInfo.externalAdReply && typeof contextInfo.externalAdReply === "object") {
            finalContextInfo.externalAdReply = {
                title: contextInfo.externalAdReply.title || "",
                body: contextInfo.externalAdReply.body || "",
                mediaType: contextInfo.externalAdReply.mediaType || 1,
                sourceUrl: contextInfo.externalAdReply.sourceUrl || contextInfo.externalAdReply.url || "",
                thumbnailUrl: contextInfo.externalAdReply.thumbnailUrl || "",
                renderLargerThumbnail: contextInfo.externalAdReply.renderLargerThumbnail || false,
                showAdAttribution: contextInfo.externalAdReply.showAdAttribution || false,
                containsAutoReply: contextInfo.externalAdReply.containsAutoReply || false,
                ...(contextInfo.externalAdReply.mediaUrl && { mediaUrl: contextInfo.externalAdReply.mediaUrl }),
                ...(contextInfo.externalAdReply.thumbnail && Buffer.isBuffer(contextInfo.externalAdReply.thumbnail) && { thumbnail: contextInfo.externalAdReply.thumbnail }),
                ...(contextInfo.externalAdReply.jpegThumbnail && { jpegThumbnail: contextInfo.externalAdReply.jpegThumbnail }),
            };
        }
        
        if (contextInfo.mentionedJid) {
            finalContextInfo.mentionedJid = contextInfo.mentionedJid;
        }

        interactivePayload.contextInfo = proto.Message.ContextInfo.create(finalContextInfo);

        const payload = proto.Message.InteractiveMessage.create(interactivePayload);

        const msg = generateWAMessageFromContent(
            jid, 
            { interactiveMessage: payload }, 
            {
                userJid: socket.user.id,
                quoted: options?.quoted || null,
            }
        );

        const additionalNodes = [{
            tag: "biz",
            attrs: {},
            content: [{
                tag: "interactive",
                attrs: { type: "native_flow", v: "1" },
                content: [{
                    tag: "native_flow",
                    attrs: { v: "9", name: "mixed" }
                }],
            }],
        }];

        await socket.relayMessage(jid, msg.message, {
            messageId: msg.key.id,
            additionalNodes,
        });

        return msg;
    };
}
