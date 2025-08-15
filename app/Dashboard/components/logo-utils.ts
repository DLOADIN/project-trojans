// Logo utilities for export functionality
export const ACCIDENTAI_LOGO_BASE64 = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMwMEQ5NTkiLz4KPHNwYW4geD0iMjAiIHk9IjI4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iYm9sZCI+QTwvc3Bhbj4KPC9zdmc+`;

export const generateLogoHTML = (size: number = 40, color: string = '#00D959') => {
  return `
    <div style="
      display: inline-block; 
      width: ${size}px; 
      height: ${size}px; 
      background-color: ${color}; 
      border-radius: 50%; 
      color: white; 
      text-align: center; 
      line-height: ${size}px; 
      font-weight: bold; 
      margin-right: 10px; 
      font-family: Arial, sans-serif;
    ">
      A
    </div>
  `;
};

export const generateHeaderHTML = (title: string, currentDate: string, reportPeriod: string) => {
  return `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="font-size: 24px; font-weight: bold; color: #00D959; margin-bottom: 10px;">
        ${generateLogoHTML(40, '#00D959')}ACCIDENTAI
      </div>
      <h2>${title}</h2>
      <p><strong>Generated on:</strong> ${currentDate}</p>
      <p><strong>Document Release Date:</strong> ${currentDate}</p>
      <p><strong>Report Period:</strong> ${reportPeriod}</p>
    </div>
  `;
};
