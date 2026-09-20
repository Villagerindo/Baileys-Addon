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
            contextInfo = {},
            mentionedJid = []
        } = content;

        if (!Array.isArray(sections) || sections.length === 0) {
            throw new Error("sections must be a non-empty array");
        }

        const processedSections = sections.map((section, sIndex) => ({
            title: section.title || `Seksi ${sIndex + 1}`,
            rows: section.rows.map((row, rIndex) => ({
                title: row.title || `Opsi ${rIndex + 1}`,
                description: row.description || "",
                rowId: row.id || `row_${sIndex}_${rIndex}`
            }))
        }));

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

        if (contextInfo.mentionedJid) finalContextInfo.mentionedJid = contextInfo.mentionedJid;

        const listTypeSingleSelect = 1;

        const listMessage = {
            title: title,
            description: text,
            footerText: footer,
            buttonText: buttonText,
            listType: listTypeSingleSelect,
            sections: processedSections,
            contextInfo: finalContextInfo
        };

        const msg = generateWAMessageFromContent(jid, { listMessage }, {
            userJid: sock?.user?.id || "0@s.whatsapp.net",
            quoted: options?.quoted || null,
        });

        const additionalNodes = [
            {
                tag: "biz",
                attrs: {},
                content: [
                    {
                        tag: "list",
                        attrs: { type: "product_list", v: "2" }
                    }
                ]
            }
        ];

        await sock.relayMessage(jid, msg.message, {
            messageId: msg.key.id,
            additionalNodes
        });

        return msg;
    };
}
