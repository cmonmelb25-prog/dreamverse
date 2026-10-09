export function getTierBadge(tier?: string) {
    switch (tier) {
     
      case "vip":
        return {
          label: "VIP",
          color: "vip",
          icon: "🥇"
        };
  
      default:
        return {
          label: "",
          color: "non vip",
          icon: "🥈"
        };
    }
  }