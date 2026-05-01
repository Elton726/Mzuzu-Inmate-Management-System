import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as sessionService from '../services/sessionService';
import * as reportService from '../services/reportService';

const initialState = {
  sessions: [],
  currentSession: null,
  statistics: [],
  todaySchedule: [],
  pendingCharity: [],
  loading: false,
  error: null,
  meta: {
    page: 1,
    pageSize: 10,
    total: 0
  }
};

export const fetchSessions = createAsyncThunk('visitation/fetchSessions', async (params) => {
  const response = await sessionService.fetchSessions(params);
  return response.data ?? response;
});

export const scheduleSession = createAsyncThunk('visitation/scheduleSession', async (payload) => {
  const response = await sessionService.scheduleSession(payload);
  return response.data ?? response;
});

export const checkInSession = createAsyncThunk('visitation/checkInSession', async (sessionId) => {
  const response = await sessionService.checkInSession(sessionId);
  return response.data ?? response;
});

export const checkOutSession = createAsyncThunk('visitation/checkOutSession', async (sessionId) => {
  const response = await sessionService.checkOutSession(sessionId);
  return response.data ?? response;
});

export const cancelSession = createAsyncThunk('visitation/cancelSession', async (sessionId) => {
  const response = await sessionService.cancelSession(sessionId);
  return response.data ?? response;
});

export const denySession = createAsyncThunk('visitation/denySession', async ({ sessionId, reason }) => {
  const response = await sessionService.denySession(sessionId, { reason });
  return response.data ?? response;
});

export const fetchSessionById = createAsyncThunk('visitation/fetchSessionById', async (sessionId) => {
  const response = await sessionService.fetchSessionById(sessionId);
  return response.data ?? response;
});

export const fetchTodaySchedule = createAsyncThunk('visitation/fetchTodaySchedule', async () => {
  const response = await reportService.fetchTodaySchedule();
  return response.data ?? response;
});

export const fetchStatistics = createAsyncThunk('visitation/fetchStatistics', async () => {
  const response = await reportService.fetchVisitationStatistics();
  return response.data ?? response;
});

export const fetchPendingCharity = createAsyncThunk('visitation/fetchPendingCharity', async () => {
  const response = await reportService.fetchPendingCharity();
  return response.data ?? response;
});

const visitationSessionSlice = createSlice({
  name: 'visitationSession',
  initialState,
  reducers: {
    clearSessionError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload?.data ?? action.payload ?? [];
        state.meta = {
          page: action.payload?.meta?.current_page || action.payload?.current_page || state.meta.page,
          pageSize: action.payload?.meta?.per_page || action.payload?.per_page || state.meta.pageSize,
          total: action.payload?.meta?.total || action.payload?.total || state.meta.total
        };
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load sessions';
      })
      .addCase(scheduleSession.fulfilled, (state, action) => {
        const session = action.payload?.data ?? action.payload;
        if (session) state.sessions.unshift(session);
      })
      .addCase(checkInSession.fulfilled, (state, action) => {
        const session = action.payload?.data ?? action.payload;
        if (!session) return;
        state.sessions = state.sessions.map((s) => (s.id === session.id ? session : s));
        if (state.currentSession?.id === session.id) state.currentSession = session;
      })
      .addCase(checkOutSession.fulfilled, (state, action) => {
        const session = action.payload?.data ?? action.payload;
        if (!session) return;
        state.sessions = state.sessions.map((s) => (s.id === session.id ? session : s));
        if (state.currentSession?.id === session.id) state.currentSession = session;
      })
      .addCase(cancelSession.fulfilled, (state, action) => {
        const session = action.payload?.data ?? action.payload;
        if (!session) return;
        state.sessions = state.sessions.map((s) => (s.id === session.id ? session : s));
        if (state.currentSession?.id === session.id) state.currentSession = session;
      })
      .addCase(denySession.fulfilled, (state, action) => {
        const session = action.payload?.data ?? action.payload;
        if (!session) return;
        state.sessions = state.sessions.map((s) => (s.id === session.id ? session : s));
        if (state.currentSession?.id === session.id) state.currentSession = session;
      })
      .addCase(fetchSessionById.fulfilled, (state, action) => {
        state.currentSession = action.payload?.data ?? action.payload;
      })
      .addCase(fetchTodaySchedule.fulfilled, (state, action) => {
        state.todaySchedule = action.payload?.data ?? action.payload ?? [];
      })
      .addCase(fetchStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload?.data ?? action.payload ?? [];
      })
      .addCase(fetchPendingCharity.fulfilled, (state, action) => {
        state.pendingCharity = action.payload?.data ?? action.payload ?? [];
      });
  }
});

export const { clearSessionError } = visitationSessionSlice.actions;
export default visitationSessionSlice.reducer;
