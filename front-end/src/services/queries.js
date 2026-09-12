import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FACE_API, QUERY_KEYS } from '@/constants/faceApi';
import api from './api';

export const loginRequest = async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data.data;
};

export const useStudents = () =>
  useQuery({
    queryKey: QUERY_KEYS.students,
    queryFn: async () => {
      const { data } = await api.get('/students');
      return data.data;
    },
  });

export const useFaceGallery = () =>
  useQuery({
    queryKey: QUERY_KEYS.faceGallery,
    queryFn: async () => {
      const { data } = await api.get('/students/gallery');
      return data.data;
    },
    staleTime: FACE_API.GALLERY_STALE_MS,
  });

export const useDashboard = () =>
  useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data.data;
    },
  });

export const useTodayAttendance = () =>
  useQuery({
    queryKey: QUERY_KEYS.attendanceToday,
    queryFn: async () => {
      const { data } = await api.get('/attendance/today');
      return data.data;
    },
  });

const invalidateEnrollQueries = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.students });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.faceGallery });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/students', payload);
      return data;
    },
    onSuccess: () => invalidateEnrollQueries(queryClient),
  });
};

export const useEnrollFace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, photoUrl, faceDescriptor }) => {
      const { data } = await api.patch(`/students/${id}/face`, { photoUrl, faceDescriptor });
      return data;
    },
    onSuccess: () => invalidateEnrollQueries(queryClient),
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.students });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.attendanceToday });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
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
