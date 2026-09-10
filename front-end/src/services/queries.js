import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from './api';

export const loginRequest = async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data.data;
};

export const useStudents = () =>
  useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data } = await api.get('/students');
      return data.data;
    },
  });

export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data.data;
    },
  });

export const useTodayAttendance = () =>
  useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const { data } = await api.get('/attendance/today');
      return data.data;
    },
  });

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/students', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useEnrollFace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, photoUrl, faceDescriptor }) => {
      const { data } = await api.patch(`/students/${id}/face`, { photoUrl, faceDescriptor });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useCheckin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/attendance/checkin', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/students/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
  });
};
