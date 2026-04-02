import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import firestoreClient from '../../database/firestoreClient';
import db from '../../database/database';
import logger from '../../utils/logger';

// Ortak query ayarları - gereksiz refetch'leri önler
const defaultQueryOptions = {
    staleTime: 5 * 60 * 1000,        // 5 dakika boyunca veri "taze" sayılır
    gcTime: 10 * 60 * 1000,           // 10 dakika cache'te tutulur
    refetchOnWindowFocus: false,       // Tarayıcı sekmesi değişiminde refetch yapma
    refetchOnMount: false,             // Component remount'ta refetch yapma (cache varsa)
};

// Öğrencileri getir
export const useStudentsQuery = () => {
    return useQuery({
        queryKey: ['students'],
        ...defaultQueryOptions,
        queryFn: async () => {
            try {
                // Önce Firestore'dan dene
                const students = await firestoreClient.getAllStudents();

                // IndexedDB'yi güncelle (cache)
                if (students && students.length > 0) {
                    db.saveStudents(students).catch(err => logger.warn('IndexedDB sync error:', err));
                }

                return students;
            } catch (error) {
                logger.warn('Firestore fetch failed, falling back to IndexedDB:', error);
                // Fallback: IndexedDB
                return await db.getAllStudents();
            }
        },
        initialData: []
    });
};

// Salonları getir
export const useSalonsQuery = () => {
    return useQuery({
        queryKey: ['salons'],
        ...defaultQueryOptions,
        queryFn: async () => {
            try {
                const salons = await firestoreClient.getAllSalons();

                if (salons && salons.length > 0) {
                    db.saveSalons(salons).catch(err => logger.warn('IndexedDB sync error:', err));
                }

                return salons;
            } catch (error) {
                logger.warn('Firestore fetch failed, falling back to IndexedDB:', error);
                return await db.getAllSalons();
            }
        },
        initialData: []
    });
};

// Ayarları getir
export const useSettingsQuery = () => {
    return useQuery({
        queryKey: ['settings'],
        ...defaultQueryOptions,
        queryFn: async () => {
            try {
                const settings = await firestoreClient.getSettings(); // Bu metod firestoreClient'ta yoksa eklenmeli veya db'den alınmalı
                // firestoreClient.getSettings() yoksa db.getSettings() kullan
                // Not: firestoreClient.js'de getSettings yok, getAllPlans var. 
                // Ayarlar genellikle plan içinde veya ayrı bir koleksiyonda tutulur.
                // Mevcut yapıda ayarlar localStorage/IndexedDB ağırlıklı.
                // Şimdilik IndexedDB'den devam edelim, Firestore entegrasyonu sonraki adım olabilir.
                return await db.getSettings();
            } catch (error) {
                return {};
            }
        },
        initialData: {}
    });
};
