'use client'

const imagens = [
  { nome: 'Imagem 1', arquivo: 'pasted_image_1773003778401.png' },
  { nome: 'Imagem 2', arquivo: 'pasted_image_1773005794596.png' },
  { nome: 'Imagem 3', arquivo: 'pasted_image_1773006655748.png' },
  { nome: 'Imagem 4', arquivo: 'pasted_image_1773012931669.png' },
  { nome: 'Imagem 5', arquivo: 'pasted_image_1773013619233.png' },
  { nome: 'Imagem 6', arquivo: 'pasted_image_1773014199676.png' },
  { nome: 'Imagem 7', arquivo: 'pasted_image_1773020056316.png' },
  { nome: 'Imagem 8', arquivo: 'pasted_image_1773021538006.png' },
]

export default function GaleriaImagens() {
  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <h1 className="text-3xl font-bold text-white mb-8 text-center">Galeria de Imagens</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {imagens.map((img, index) => (
          <div key={index} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h2 className="text-white text-lg font-semibold mb-3">{img.nome}</h2>
            <p className="text-gray-400 text-sm mb-2">{img.arquivo}</p>
            <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
              <img
                src={`/imagens/${img.arquivo}`}
                alt={img.nome}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="text-center mt-8">
        <a href="/" className="text-purple-400 hover:text-purple-300 underline">
          ← Voltar para a página principal
        </a>
      </div>
    </div>
  )
}
