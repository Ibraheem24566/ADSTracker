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
        ? ["Money printer go brrr 🖨️", "Your wallet is crying 💸", "Google's shareholders thank you �", "Spend is on a rampage 🦖", "Your credit card called, it's scared 😱"]
        : ["Your accountant just did a happy dance �", "Cha-ching! You found money under the couch 💰", "Budget breathing room found, go buy a coffee ☕", "Savings! Now you can afford that second yacht 🛥️"];
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
        ? ["Leads are getting bougie 💅", "CPL is living its best life, unfortunately 🎉", "Premium lead pricing activated, enjoy the luxury ⭐", "Leads now come with a golden frame 🖼️"]
        : ["Leads went on sale! Black Friday came early 🏷️", "Your CPL is on a diet, looking slim 🥗", "Budget-friendly leads unlocked, your wallet thanks you 🎯", "CPL dropped, time to celebrate with cheap pizza 🍕"];
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
          "The chosen one, obviously 🏆",
          "MVP of the season, no contest 🌟",
          "Carrying the entire team, literally 💪",
          "Lead magnet supreme, magnetic personality 🧲",
          "The main character energy is strong here 🎬"
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
      "This needs attention like, right now 🚨",
      "Houston, we have a problem, and it's not the aliens 🛸",
      "Red alert! Put down the coffee and fix this 🚩",
      "Time to intervene before things get spicy ⏰",
      "Your campaigns are throwing a tantrum 🤬"
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
      "Worth keeping an eye on, but don't panic 👁️",
      "Not terrible, but not great either, like a lukewarm coffee 🤷",
      "Could be better, could be worse, could be pizza 🎭",
      "Mild concern detected, nothing to lose sleep over 🌡️",
      "It's giving... mixed energy 🤔"
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
      "The usual suspect, caught red-handed 🕵️",
      "Public enemy #1, basically a villain 🎬",
      "The crowd favorite, unfortunately 🎭",
      "Rejection champion, wearing the crown proudly 🏅",
      "The lead killer, striking again 🗡️"
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
      wittyMessages = ["Crushing it! Your sales team is unstoppable 🚀", "Absolutely killing it, like literally 💪", "Performance mode activated, where's the trophy ⚡", "On fire! Call the fire department 🔥", "Sales gods have blessed you 🙏"];
      icon = "🎉";
    } else if (soldRate >= 40) {
      wittyMessages = ["Not bad, not bad, could be worse 🤔", "Could go either way, like a coin toss 🎲", "Middle of the road, literally average 🛣️", "Meh, it's okay, I guess 😐", "It's fine, everything is fine 😅"];
      icon = "🤷";
    } else {
      wittyMessages = ["Rough patch ahead, bring an umbrella 🌧️", "Needs some love, and maybe therapy ❤️‍🩹", "Room for improvement, lots of room 📈", "Time to strategize, or panic, your choice 🧠", "Not great, not terrible, just... concerning 😬"];
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
      "Smooth sailing! Your campaigns are basically perfect 🌊",
      "All clear! Your campaigns are behaving like angels 🎉",
      "Boring is good! No drama detected, which is suspicious 😴",
      "Peace and quiet 🧘 — enjoy the calm before the storm!",
      "No news is good news! Your campaigns are chill, maybe too chill 📰",
      "Nothing to report! Everything is running smoothly, shockingly 🤷"
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
