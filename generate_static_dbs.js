import fs from 'fs';
import path from 'path';

const csvPath = path.resolve('doc/Taco-4a-Edicao(CMVCol taco3).csv');
const webDbPath = path.resolve('src/data/foodDatabase.js');
const mobileDbPath = path.resolve('mobile/src/data/foodDatabase.ts');

const initialDietPresetsCode = `export const initialDietPresets = {
  emagrecimento: {
    name: 'Dieta de Definição / Emagrecimento (Déficit Calórico)',
    description: 'Focada em alta ingestão de proteínas para preservar massa magra e carboidratos moderados/baixos.',
    calorieFactor: 0.8, // 20% déficit
    meals: [
      {
        name: 'Café da Manhã',
        items: [
          { name: 'Ovo Inteiro Cozido', quantity: 100, protein: 12.6, carbs: 1.1, fat: 10.6, calories: 155 },
          { name: 'Pão de Forma Integral', quantity: 50, protein: 5.0, carbs: 22.0, fat: 1.4, calories: 120 }
        ]
      },
      {
        name: 'Almoço',
        items: [
          { name: 'Peito de Frango Grelhado', quantity: 150, protein: 46.5, carbs: 0, fat: 5.4, calories: 247 },
          { name: 'Arroz Integral Cozido', quantity: 100, protein: 2.6, carbs: 23, fat: 0.9, calories: 111 },
          { name: 'Feijão Carioca Cozido', quantity: 80, protein: 3.8, carbs: 10.9, fat: 0.4, calories: 61 }
        ]
      },
      {
        name: 'Lanche da Tarde',
        items: [
          { name: 'Iogurte Natural Desnatado', quantity: 200, protein: 7.6, carbs: 12.4, fat: 0.2, calories: 82 },
          { name: 'Banana Prata', quantity: 80, protein: 0.9, carbs: 18.2, fat: 0.2, calories: 71 }
        ]
      },
      {
        name: 'Jantar',
        items: [
          { name: 'Filet de Tilápia Grelhado', quantity: 150, protein: 34.5, carbs: 0, fat: 3.0, calories: 166 },
          { name: 'Batata Doce Cozida', quantity: 100, protein: 1.6, carbs: 20, fat: 0.1, calories: 86 }
        ]
      }
    ]
  },
  manutencao: {
    name: 'Dieta de Equilíbrio / Manutenção',
    description: 'Calorias equilibradas para manter o peso atual e otimizar a performance física.',
    calorieFactor: 1.0,
    meals: [
      {
        name: 'Café da Manhã',
        items: [
          { name: 'Ovo Inteiro Cozido', quantity: 100, protein: 12.6, carbs: 1.1, fat: 10.6, calories: 155 },
          { name: 'Pão de Forma Integral', quantity: 50, protein: 5.0, carbs: 22.0, fat: 1.4, calories: 120 },
          { name: 'Banana Prata', quantity: 100, protein: 1.1, carbs: 22.8, fat: 0.3, calories: 89 }
        ]
      },
      {
        name: 'Almoço',
        items: [
          { name: 'Carne Patinho Grelhado', quantity: 120, protein: 43.1, carbs: 0, fat: 8.8, calories: 263 },
          { name: 'Arroz Branco Cozido', quantity: 150, protein: 3.8, carbs: 42, fat: 0.3, calories: 195 },
          { name: 'Feijão Carioca Cozido', quantity: 100, protein: 4.8, carbs: 13.6, fat: 0.5, calories: 76 }
        ]
      },
      {
        name: 'Lanche da Tarde',
        items: [
          { name: 'Whey Protein 80%', quantity: 30, protein: 24, carbs: 3.0, fat: 1.5, calories: 120 },
          { name: 'Aveia em Flocos', quantity: 30, protein: 5.1, carbs: 19.9, fat: 2.1, calories: 117 }
        ]
      },
      {
        name: 'Jantar',
        items: [
          { name: 'Peito de Frango Grelhado', quantity: 150, protein: 46.5, carbs: 0, fat: 5.4, calories: 247 },
          { name: 'Batata Doce Cozida', quantity: 150, protein: 2.4, carbs: 30, fat: 0.2, calories: 129 },
          { name: 'Azeite de Oliva Extra Virgem', quantity: 10, protein: 0, carbs: 0, fat: 10, calories: 88 }
        ]
      }
    ]
  },
  hipertrofia: {
    name: 'Dieta de Ganho / Hipertrofia (Superávit Calórico)',
    description: 'Focada em fornecer nutrientes e energia de sobra para maximizar o ganho de massa muscular.',
    calorieFactor: 1.15, // 15% superávit
    meals: [
      {
        name: 'Café da Manhã',
        items: [
          { name: 'Ovo Inteiro Cozido', quantity: 100, protein: 12.6, carbs: 1.1, fat: 10.6, calories: 155 },
          { name: 'Pão de Forma Integral', quantity: 75, protein: 7.5, carbs: 33.0, fat: 2.1, calories: 180 },
          { name: 'Banana Prata', quantity: 100, protein: 1.1, carbs: 22.8, fat: 0.3, calories: 89 }
        ]
      },
      {
        name: 'Almoço',
        items: [
          { name: 'Carne Patinho Grelhado', quantity: 150, protein: 53.9, carbs: 0, fat: 11.0, calories: 329 },
          { name: 'Arroz Branco Cozido', quantity: 250, protein: 6.3, carbs: 70, fat: 0.5, calories: 325 },
          { name: 'Feijão Carioca Cozido', quantity: 100, protein: 4.8, carbs: 13.6, fat: 0.5, calories: 76 }
        ]
      },
      {
        name: 'Lanche da Tarde',
        items: [
          { name: 'Whey Protein 80%', quantity: 30, protein: 24, carbs: 3.0, fat: 1.5, calories: 120 },
          { name: 'Aveia em Flocos', quantity: 50, protein: 8.5, carbs: 33.2, fat: 3.5, calories: 195 },
          { name: 'Pasta de Amendoim Integral', quantity: 20, protein: 5.0, carbs: 4.0, fat: 10.0, calories: 120 }
        ]
      },
      {
        name: 'Jantar',
        items: [
          { name: 'Peito de Frango Grelhado', quantity: 180, protein: 55.8, carbs: 0, fat: 6.5, calories: 297 },
          { name: 'Batata Doce Cozida', quantity: 200, protein: 3.2, carbs: 40, fat: 0.2, calories: 172 },
          { name: 'Azeite de Oliva Extra Virgem', quantity: 13, protein: 0, carbs: 0, fat: 13, calories: 115 }
        ]
      }
    ]
  }
};`;

try {
  const content = fs.readFileSync(csvPath, 'latin1');
  const lines = content.split(/\r?\n/);
  
  let currentCategory = '';
  const foods = [];

  const ignoreKeywords = [
    'número do', 'nmero do', 'descrição dos alimentos', 'descrio dos alimentos',
    'umidade', 'energia', 'proteína', 'protena', 'lipídeos', 'lipdeos',
    'carboidrato', 'taco', 'legenda', 'cinzas', 'colesterol', 'fibra'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    const firstPart = parts[0]?.trim();
    const secondPart = parts[1]?.trim();

    if (!firstPart) continue;

    const isHeader = ignoreKeywords.some(keyword => 
      firstPart.toLowerCase().includes(keyword) || 
      (secondPart && secondPart.toLowerCase().includes(keyword))
    );

    if (isHeader) continue;

    const hasOnlyFirstPart = parts.slice(1).every(p => !p.trim());
    if (hasOnlyFirstPart && isNaN(Number(firstPart))) {
      currentCategory = firstPart;
      continue;
    }

    const id = Number(firstPart);
    if (!isNaN(id) && id > 0) {
      const name = parts[1]?.trim();
      if (!name) continue;
      
      const cleanValue = (val) => {
        if (!val) return 0;
        const cleaned = val.trim().replace(',', '.');
        if (cleaned === 'NA' || cleaned === 'Tr' || cleaned === '*' || cleaned === '-') return 0;
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      const calories = Math.round(cleanValue(parts[3]));
      const protein = cleanValue(parts[5]);
      const fat = cleanValue(parts[6]);
      const carbs = cleanValue(parts[8]);

      foods.push({
        id: id.toString(),
        name,
        calories,
        protein,
        carbs,
        fat,
        servingSize: '100g',
        category: currentCategory || 'Geral'
      });
    }
  }

  console.log(`Parseado ${foods.length} alimentos da TACO.`);

  // Gerar conteúdo web
  const webContent = `export const initialFoodDatabase = ${JSON.stringify(foods, null, 2)};\n\n${initialDietPresetsCode}\n`;
  fs.writeFileSync(webDbPath, webContent, 'utf8');
  console.log(`Salvo em ${webDbPath}`);

  // Gerar conteúdo mobile
  const mobileContent = `export const initialFoodDatabase: any[] = ${JSON.stringify(foods, null, 2)};\n\n${initialDietPresetsCode}\n`;
  fs.writeFileSync(mobileDbPath, mobileContent, 'utf8');
  console.log(`Salvo em ${mobileDbPath}`);

} catch (err) {
  console.error('Erro ao processar as bases estáticas:', err);
}
