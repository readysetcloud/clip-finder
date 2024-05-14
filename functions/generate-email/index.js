exports.handler = async (state) => {
  const { clips, videoUrl } = state;
  let html = '<html><body style="font-family: Arial, sans-serif;">';

  clips.forEach((item, index) => {
    const clipUrl = `${videoUrl}&t=${item.start}s`;

    html += `
      <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
        <h2><a href="${clipUrl}" style="text-decoration: none; color: #0056b3;">Clip ${index + 1}</a></h2>
        <p>${item.summary}</p>
        <p><strong>Duration:</strong> ${item.duration} seconds</p>
      </div>
    `;
  });

  html += '</body></html>';
  return { html };
};
