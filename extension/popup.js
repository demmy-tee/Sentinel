document.getElementById('scanBtn').addEventListener('click', async () => {
  const address = document.getElementById('address').value;
  const resultDiv = document.getElementById('result');
  const btn = document.getElementById('scanBtn');

  if (!address) return;

  btn.innerText = "Scanning...";
  resultDiv.style.display = "none";

  try {
    // TALK TO YOUR LOCAL SERVER
    const response = await fetch('http://localhost:3000/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractAddress: address })
    });
    
    const data = await response.json();

    // Show Results
    resultDiv.style.display = "block";
    resultDiv.className = data.riskLevel; // Adds class .High, .Medium, or .Low
    resultDiv.innerHTML = `
      <h3>${data.riskLevel} Risk (${data.riskScore}/100)</h3>
      <p style="font-size: 12px">${data.summary}</p>
    `;

  } catch (error) {
    resultDiv.style.display = "block";
    resultDiv.innerHTML = "Error connecting to server. Is localhost:3000 running?";
  }
  
  btn.innerText = "SCAN RISK";
});