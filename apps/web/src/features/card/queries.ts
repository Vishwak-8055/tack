import { useQuery } from '@tanstack/react-query';
import type { CardDetail } from '@tack/shared';
import { api } from '@/lib/api';

export const cardKey = (cardId: string) => ['card', cardId] as const;

export const useCard = (cardId: string) =>
  useQuery({ queryKey: cardKey(cardId), queryFn: () => api.get<CardDetail>(`/cards/${cardId}`) });
