/**
 * Genetik Algoritma ile Yerleştirme Optimizasyonu
 * Boş koltukları doldurmak için evrimsel optimizasyon
 */

import logger from '../../utils/logger';
import { getNeighbors } from '../utils/helpers';
import { isGenderValid, isClassLevelValid } from '../validation/constraints';

/**
 * Genetik algoritma ile optimizasyon
 */
export const geneticOptimize = (salon, plan2D, options = {}) => {
  const {
    populationSize = 50,
    generations = 100,
    mutationRate = 0.1,
    crossoverRate = 0.8
  } = options;

  logger.info(`🧬 Genetik algoritma optimizasyonu başlıyor...`);
  logger.info(`📊 Popülasyon: ${populationSize}, Nesil: ${generations}`);

  // Boş koltukları ve dolu koltukları tespit et
  const { emptySeats, occupiedSeats } = analyzeSeats(plan2D);
  
  if (emptySeats.length === 0) {
    logger.info(`📝 Boş koltuk bulunamadı, optimizasyon atlanıyor`);
    return 0;
  }

  // İlk popülasyonu oluştur
  let population = generateInitialPopulation(plan2D, emptySeats, occupiedSeats, populationSize);
  
  let bestSolution = null;
  let bestFitness = -Infinity;

  // Evrim döngüsü
  for (let generation = 0; generation < generations; generation++) {
    // Her bireyin fitness'ını hesapla
    const fitnessScores = population.map(individual => 
      calculateFitness(individual, plan2D, emptySeats)
    );

    // En iyi çözümü güncelle
    const maxFitness = Math.max(...fitnessScores);
    const bestIndex = fitnessScores.indexOf(maxFitness);
    
    if (maxFitness > bestFitness) {
      bestFitness = maxFitness;
      bestSolution = population[bestIndex];
    }

    if (generation % 10 === 0) {
      logger.debug(`🧬 Nesil ${generation}: En iyi fitness = ${maxFitness.toFixed(2)}`);
    }

    // Yeni nesil oluştur
    const newPopulation = [];
    
    // En iyi %10'u koru (elitizm)
    const eliteCount = Math.floor(populationSize * 0.1);
    const sortedIndices = fitnessScores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.index);
    
    for (let i = 0; i < eliteCount; i++) {
      newPopulation.push(population[sortedIndices[i]]);
    }

    // Kalan %90'ı üret
    while (newPopulation.length < populationSize) {
      const parent1 = tournamentSelection(population, fitnessScores);
      const parent2 = tournamentSelection(population, fitnessScores);
      
      let child1, child2;
      if (Math.random() < crossoverRate) {
        [child1, child2] = crossover(parent1, parent2);
      } else {
        child1 = [...parent1];
        child2 = [...parent2];
      }

      // Mutasyon uygula
      if (Math.random() < mutationRate) {
        child1 = mutate(child1, emptySeats, occupiedSeats);
      }
      if (Math.random() < mutationRate) {
        child2 = mutate(child2, emptySeats, occupiedSeats);
      }

      newPopulation.push(child1);
      if (newPopulation.length < populationSize) {
        newPopulation.push(child2);
      }
    }

    population = newPopulation;
  }

  // En iyi çözümü uygula
  if (bestSolution) {
    applySolution(bestSolution, plan2D, emptySeats);
    logger.info(`✅ Genetik optimizasyon tamamlandı. En iyi fitness: ${bestFitness.toFixed(2)}`);
    return bestFitness;
  }

  return 0;
};

/**
 * Koltukları analiz eder
 */
const analyzeSeats = (plan2D) => {
  const emptySeats = [];
  const occupiedSeats = [];
  
  for (let satir = 0; satir < plan2D.length; satir++) {
    for (let sutun = 0; sutun < plan2D[satir].length; sutun++) {
      const seat = plan2D[satir][sutun];
      if (seat?.ogrenci) {
        occupiedSeats.push({
          satir,
          sutun,
          ogrenci: seat.ogrenci,
          grup: seat.grup
        });
      } else {
        emptySeats.push({
          satir,
          sutun,
          grup: seat?.grup
        });
      }
    }
  }
  
  return { emptySeats, occupiedSeats };
};

/**
 * İlk popülasyonu oluşturur
 */
const generateInitialPopulation = (plan2D, emptySeats, occupiedSeats, populationSize) => {
  const population = [];
  
  for (let i = 0; i < populationSize; i++) {
    const individual = [];
    
    // Her boş koltuk için rastgele bir dolu koltuk seç
    for (const emptySeat of emptySeats) {
      const randomOccupied = occupiedSeats[Math.floor(Math.random() * occupiedSeats.length)];
      individual.push({
        emptySeat,
        sourceSeat: randomOccupied
      });
    }
    
    population.push(individual);
  }
  
  return population;
};

/**
 * Bireyin fitness'ını hesaplar
 */
const calculateFitness = (individual, plan2D, emptySeats) => {
  let fitness = 0;
  
  for (const move of individual) {
    const { emptySeat, sourceSeat } = move;
    const student = sourceSeat.ogrenci;
    
    // Kısıt kontrolü
    const komsular = getNeighbors(emptySeat.satir, emptySeat.sutun, plan2D.length, plan2D[0].length);
    const genderValid = isGenderValid(student, komsular, plan2D, emptySeat.grup);
    const classValid = isClassLevelValid(student, komsular, plan2D, emptySeat.grup);
    
    if (genderValid && classValid) {
      // Boş koltuk doldurma bonusu
      fitness += 100;
      
      // Kısıt uyumluluğu bonusu
      fitness += 20;
      
      // Mesafe cezası (yakın koltuklar tercih edilir)
      const distance = Math.abs(emptySeat.satir - sourceSeat.satir) + 
                      Math.abs(emptySeat.sutun - sourceSeat.sutun);
      fitness += Math.max(0, 10 - distance);
    } else {
      // Kısıt ihlali cezası
      fitness -= 50;
    }
  }
  
  return fitness;
};

/**
 * Turnuva seçimi
 */
const tournamentSelection = (population, fitnessScores, tournamentSize = 3) => {
  const tournament = [];
  
  for (let i = 0; i < tournamentSize; i++) {
    const randomIndex = Math.floor(Math.random() * population.length);
    tournament.push({
      individual: population[randomIndex],
      fitness: fitnessScores[randomIndex]
    });
  }
  
  tournament.sort((a, b) => b.fitness - a.fitness);
  return tournament[0].individual;
};

/**
 * Çaprazlama (crossover)
 */
const crossover = (parent1, parent2) => {
  const child1 = [];
  const child2 = [];
  
  for (let i = 0; i < parent1.length; i++) {
    if (Math.random() < 0.5) {
      child1.push(parent1[i]);
      child2.push(parent2[i]);
    } else {
      child1.push(parent2[i]);
      child2.push(parent1[i]);
    }
  }
  
  return [child1, child2];
};

/**
 * Mutasyon
 */
const mutate = (individual, emptySeats, occupiedSeats) => {
  const mutated = [...individual];
  
  // Rastgele bir hareketi değiştir
  const randomIndex = Math.floor(Math.random() * mutated.length);
  const randomOccupied = occupiedSeats[Math.floor(Math.random() * occupiedSeats.length)];
  
  mutated[randomIndex] = {
    emptySeat: mutated[randomIndex].emptySeat,
    sourceSeat: randomOccupied
  };
  
  return mutated;
};

/**
 * En iyi çözümü uygular
 */
const applySolution = (solution, plan2D, emptySeats) => {
  for (const move of solution) {
    const { emptySeat, sourceSeat } = move;
    const student = sourceSeat.ogrenci;
    
    // Kısıt kontrolü
    const komsular = getNeighbors(emptySeat.satir, emptySeat.sutun, plan2D.length, plan2D[0].length);
    const genderValid = isGenderValid(student, komsular, plan2D, emptySeat.grup);
    const classValid = isClassLevelValid(student, komsular, plan2D, emptySeat.grup);
    
    if (genderValid && classValid) {
      // Öğrenciyi boş koltuğa taşı
      plan2D[emptySeat.satir][emptySeat.sutun] = {
        ogrenci: student,
        grup: emptySeat.grup
      };
      
      // Eski koltuğu boşalt
      plan2D[sourceSeat.satir][sourceSeat.sutun] = {
        grup: sourceSeat.grup
      };
      
      logger.debug(`🧬 Genetik hareket: ${student.ad} → (${emptySeat.satir},${emptySeat.sutun})`);
    }
  }
};



























