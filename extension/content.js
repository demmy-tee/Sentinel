// 1. Check if we are on a page with a contract address
const currentUrl = window.location.href;
const addressRegex = /(0x[a-fA-F0-9]{40})/; // Looks for "0x" followed by 40 chars
const match = currentUrl.match(addressRegex);

if (match) {
  const address = match[1];
  console.log("Sentinel detected contract:", address);

  // 2. Create a "Floating Badge"
  const badge = document.createElement("div");
  badge.innerHTML = "🛡️ Scanning...";
  badge.style.position = "fixed";
  badge.style.bottom = "20px";
  badge.style.right = "20px";
  badge.style.backgroundColor = "black";
  badge.style.color = "white";
  badge.style.padding = "15px";
  badge.style.borderRadius = "10px";
  badge.style.zIndex = "9999";
  badge.style.border = "2px solid #a855f7";
  document.body.appendChild(badge);

  // 3. Ask Next.js API for the score
  fetch('https://your-vercel-app.vercel.app/api/audit', {
      method: 'POST',
      body: JSON.stringify({ contractAddress: address })
  })
  .then(res => res.json())
  .then(data => {
      // 4. Update the Badge Color
      badge.style.backgroundColor = data.riskLevel === 'High' ? '#450a0a' : '#052e16';
      badge.innerHTML = `
        <strong>${data.riskLevel} Risk</strong> (${data.riskScore}/100)<br/>
        <small>${data.summary}</small>
      `;
  });
}