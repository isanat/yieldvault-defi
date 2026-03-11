import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function analyzeImages() {
  const zai = await ZAI.create();
  
  const images = [
    "/home/z/my-project/upload/pasted_image_1773003778401.png",
    "/home/z/my-project/upload/pasted_image_1773005794596.png",
    "/home/z/my-project/upload/pasted_image_1773006655748.png",
    "/home/z/my-project/upload/pasted_image_1773012931669.png",
    "/home/z/my-project/upload/pasted_image_1773013619233.png",
    "/home/z/my-project/upload/pasted_image_1773014199676.png",
    "/home/z/my-project/upload/pasted_image_1773020056316.png",
    "/home/z/my-project/upload/pasted_image_1773021538006.png"
  ];
  
  // Analyze each image
  for (let i = 0; i < images.length; i++) {
    const imgPath = images[i];
    const imageBuffer = fs.readFileSync(imgPath);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analise esta imagem em detalhes. Se houver texto, leia-o completamente. Descreva o que está sendo mostrado.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    });
    
    console.log(`\n=== IMAGEM ${i + 1}: ${imgPath.split('/').pop()} ===`);
    console.log(response.choices[0]?.message?.content);
  }
}

analyzeImages().catch(console.error);
