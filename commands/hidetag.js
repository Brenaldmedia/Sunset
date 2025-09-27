// === hidetag.js ===
module.exports = {
  pattern: "hidetag",
  desc: "Tag all Members for Any Message/Media - Admin/Owner Only",
  category: "group",
  use: ".hidetag [message] or reply to a message",
  filename: __filename,

  execute: async (conn, message, m, { q, reply, from, isGroup, sender }) => {
    try {
      if (!isGroup) return reply("❌ This command can only be used in groups.");

      // --- Fetch group metadata ---
      let metadata;
      try {
        metadata = await conn.groupMetadata(from);
      } catch (err) {
        console.error("Failed to fetch group metadata:", err);
        return reply("❌ Failed to get group information.");
      }

      if (!metadata?.participants) {
        return reply("❌ No participants found in this group.");
      }

      // --- normalize JIDs ---
      const jidToBase = (jid) => {
        if (!jid) return "";
        const left = String(jid).split("@")[0];
        return left.split(":")[0];
      };

      const rawSender = m.key?.participant || m.participant || sender || "";
      const senderBase = jidToBase(rawSender);
      const botBase = jidToBase(conn?.user?.id || "");

      // --- Admin check ---
      const participant = metadata.participants.find(p => jidToBase(p.id) === senderBase);
      const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";

      // --- Owner check (from .env) ---
      let owners = [];
      if (process.env.OWNER_NUMBER) {
        owners = process.env.OWNER_NUMBER.split(",").map(num => num.trim());
      }
      const isOwner = botBase === senderBase || owners.includes(senderBase);

      console.log(`[hidetag] rawSender=${rawSender} senderBase=${senderBase} botBase=${botBase} owners=${JSON.stringify(owners)} isAdmin=${isAdmin} isOwner=${isOwner}`);

      // --- Permissions ---
      if (!isAdmin && !isOwner) {
        return reply("❌ Only group admins or bot owner can use this command.");
      }

      // --- Mentions ---
      const participants = metadata.participants.map(p => p.id);

      if (!q && !m.quoted) {
        return reply("❌ Provide a message or reply to a message.");
      }

      // React 👀
      await conn.sendMessage(from, { react: { text: "👀", key: message.key } });

      // --- If user replied to a message ---
      if (m.quoted) {
        const quoted = m.quoted;
        return await conn.sendMessage(
          from,
          {
            forward: quoted.message,
            mentions: participants,
            contextInfo: {
              mentionedJid: participants,
              forwardingScore: 200,
              isForwarded: false
            }
          },
          { quoted: message }
        );
      }

      // --- If user typed text ---
      if (q) {
        return await conn.sendMessage(
          from,
          {
            text: q,
            mentions: participants,
            contextInfo: {
              mentionedJid: participants,
              forwardingScore: 200,
              isForwarded: false
            }
          },
          { quoted: message }
        );
      }

    } catch (e) {
      console.error("Hidetag error:", e);
      await conn.sendMessage(from, { react: { text: "❌", key: message.key } });
      reply(`⚠️ Failed to send hidetag.\n\n${e.message}`);
    }
  }
};
