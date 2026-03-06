import { uploadToStorage, deleteFromStorage } from "./server/supabaseStorage";

async function test() {
  console.log("🚀 Iniciando teste de upload para o Supabase...");
  
  // Imagem de teste: 1x1 pixel preto
  const dummyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  const testFileName = `test-image-${Date.now()}.png`;
  const bucket = "photos";

  try {
    console.log(`📤 Fazendo upload de ${testFileName} para o bucket '${bucket}'...`);
    const publicUrl = await uploadToStorage(bucket, testFileName, dummyPng);
    console.log(`✅ Upload concluído! URL Principal: ${publicUrl}`);

    const isOriginal = publicUrl.includes("_original.");
    
    if (isOriginal) {
      const baseUrl = publicUrl.split("_original.")[0];
      const extension = publicUrl.split(".").pop();
      const feedUrl = `${baseUrl}_feed.${extension}`;
      const thumbUrl = `${baseUrl}_thumb.${extension}`;

      console.log("🔍 Verificando variantes estáticas...");
      
      const checkVariant = async (url: string, name: string) => {
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok) {
            console.log(`   [OK] Variante ${name} existe.`);
          } else {
            console.log(`   [ERRO] Variante ${name} NÃO encontrada (Status: ${res.status})`);
          }
        } catch (e) {
          console.log(`   [ERRO] Falha ao conectar em ${name}`);
        }
      };

      await checkVariant(feedUrl, "FEED (800px)");
      await checkVariant(thumbUrl, "THUMB (400px)");
    }

    console.log("🗑️ Limpando arquivos...");
    await deleteFromStorage(publicUrl);
    console.log("✅ Limpeza concluída.");

  } catch (err) {
    console.error("❌ Erro:", err);
  }
}

test();
