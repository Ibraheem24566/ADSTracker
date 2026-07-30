// Generates short, scannable "what changed and what to do about it" cards.
// Every insight here is computed from numbers the API already returns --
// nothing is invented or hardcoded per-account. If the data can't support
// a claim, the insight is simply not shown.
function buildInsights({ current, previous, alerts, rejectionInsight, campaignRows }) {
  const insights = [];

  // Spend trajectory vs prior period of the same length.
  if (previous.cost > 0) {
    const spendChange = ((current.cost - previous.cost) / previous.cost) * 100;
    if (Math.abs(spendChange) >= 10) {
      const wittyMessages = spendChange > 0 
        ? ["Money printer go brrr 🖨️", "Your wallet is getting lighter 💸", "Spend is having a moment ✨"]
        : ["Your accountant will be pleased 📊", "Cha-ching! Savings detected 💰", "Budget breathing room found 🌬️"];
      insights.push({
        tone: spendChange > 0 ? "warn" : "good",
        icon: spendChange > 0 ? "🔥" : "💎",
        text: <>{wittyMessages[Math.floor(Math.random() * wittyMessages.length)]} — Spend is <b>{Math.abs(spendChange).toFixed(0)}% {spendChange > 0 ? "higher" : "lower"}</b> than before.</>,
      });
    }
  }

  // Cost-per-lead trajectory.
  if (previous.cost_per_lead && current.cost_per_lead) {
    const cplChange = ((current.cost_per_lead - previous.cost_per_lead) / previous.cost_per_lead) * 100;
    if (Math.abs(cplChange) >= 10) {
      const wittyMessages = cplChange > 0
        ? ["Leads are getting fancy 💅", "CPL is living its best life 🎉", "Premium lead pricing activated ⭐"]
        : ["Leads went on sale! 🏷️", "Your CPL is on a diet 🥗", "Budget-friendly leads unlocked 🎯"];
      insights.push({
        tone: cplChange > 0 ? "bad" : "good",
        icon: cplChange > 0 ? "📈" : "📉",
        text: <>{wittyMessages[Math.floor(Math.random() * wittyMessages.length)]} — CPL <b>{cplChange > 0 ? "rose" : "fell"} {Math.abs(cplChange).toFixed(0)}%</b>.</>,
      });
    }
  }

  // Which campaign is driving the most leads right now.
  if (campaignRows && campaignRows.length > 1 && current.total_leads > 0) {
    const top = [...campaignRows].sort((a, b) => b.lead_count - a.lead_count)[0];
    if (top.lead_count > 0) {
      const share = (top.lead_count / current.total_leads) * 100;
      if (share >= 30) {
        const wittyMessages = [
          "The chosen one 🏆",
          "MVP of the season 🌟",
          "Carrying the team 💪",
          "Lead magnet supreme 🧲"
        ];
        insights.push({
          tone: "info",
          icon: "👑",
          text: <><b>{top.campaign_name}</b> is {wittyMessages[Math.floor(Math.random() * wittyMessages.length)]} — {share.toFixed(0)}% of all leads.</>,
        });
      }
    }
  }

  // Highest-severity live alerts (wasted spend / expensive CPL / budget-limited).
  const highAlert = alerts.find((a) => a.severity === "high");
  if (highAlert) {
    const wittyMessages = [
      "This needs attention ASAP 🚨",
      "Houston, we have a problem 🛸",
      "Red alert! 🚩",
      "Time to intervene ⏰"
    ];
    insights.push({
      tone: "bad",
      icon: "🚨",
      text: <>{wittyMessages[Math.floor(Math.random() * wittyMessages.length)]} <b>{highAlert.keyword_text}</b> ({highAlert.campaign_name}) — {highAlert.message.toLowerCase()}.</>,
    });
  }
  const mediumAlert = alerts.find((a) => a.severity === "medium");
  if (mediumAlert) {
    const wittyMessages = [
      "Worth keeping an eye on 👁️",
      "Not terrible, but not great either 🤷",
      "Could be better, could be worse 🎭",
      "Mild concern detected 🌡️"
    ];
    insights.push({
      tone: "warn",
      icon: "👀",
      text: <>{wittyMessages[Math.floor(Math.random() * wittyMessages.length)]} <b>{mediumAlert.keyword_text}</b> ({mediumAlert.campaign_name}) — {mediumAlert.message.toLowerCase()}.</>,
    });
  }

  // Lead-quality: the single biggest rejection reason this period.
  if (rejectionInsight.breakdown.length > 0) {
    const top = rejectionInsight.breakdown[0];
    const totalRejected = rejectionInsight.breakdown.reduce((s, r) => s + r.count, 0);
    const wittyMessages = [
      "The usual suspect 🕵️",
      "Public enemy #1 🎬",
      "The crowd favorite 🎭",
      "Rejection champion 🏅"
    ];
    insights.push({
      tone: "warn",
      icon: "🚫",
      text: <><b>{top.reason}</b> is {wittyMessages[Math.floor(Math.random() * wittyMessages.length)]} — {top.count} of {totalRejected} rejected leads.</>,
    });
  }

  // Sold vs rejected ratio, when we have enough resolved leads to say anything.
  const resolved = current.sold_leads + current.rejected_leads;
  if (resolved >= 5) {
    const soldRate = (current.sold_leads / resolved) * 100;
    let wittyMessages, icon;
    if (soldRate >= 60) {
      wittyMessages = ["Crushing it! 🚀", "Absolutely killing it 💪", "Performance mode activated ⚡", "On fire! 🔥"];
      icon = "🎉";
    } else if (soldRate >= 40) {
      wittyMessages = ["Not bad, not bad 🤔", "Could go either way 🎲", "Middle of the road 🛣️", "Meh, it's okay 😐"];
      icon = "🤷";
    } else {
      wittyMessages = ["Rough patch ahead 🌧️", "Needs some love ❤️‍🩹", "Room for improvement 📈", "Time to strategize 🧠"];
      icon = "😬";
    }
    insights.push({
      tone: soldRate >= 60 ? "good" : soldRate >= 40 ? "info" : "bad",
      icon: icon,
      text: <>{wittyMessages[Math.floor(Math.random() * wittyMessages.length)]} — <b>{soldRate.toFixed(0)}%</b> sold ({current.sold_leads} of {resolved}).</>,
    });
  }

  return insights;
}

export default function InsightsPanel({ current, previous, alerts, rejectionInsight, campaignRows }) {
  const insights = buildInsights({ current, previous, alerts, rejectionInsight, campaignRows });

  if (insights.length === 0) {
    const emptyMessages = [
      "Smooth sailing! 🌊 Nothing to worry about right now.",
      "All clear! 🎉 Your campaigns are behaving nicely.",
      "Boring is good! 😴 No drama detected in your data.",
      "Peace and quiet 🧘 — enjoy the calm while it lasts!",
      "No news is good news! 📰 Your campaigns are chill."
    ];
    return <div className="empty-state">{emptyMessages[Math.floor(Math.random() * emptyMessages.length)]}</div>;
  }

  return (
    <div className="insight-grid fade-in">
      {insights.map((ins, i) => (
        <div className={`insight-card ${ins.tone}`} key={i}>
          <div className="icon">{ins.icon}</div>
          <div className="body">{ins.text}</div>
        </div>
      ))}
    </div>
  );
}
