import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as visitorService from '../services/visitorService';
import * as registrationService from '../services/registrationService';

const initialState = {
  visitors: [],
  approvedVisitors: [],
  currentVisitor: null,
  registrations: [],
  registrationMeta: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
  }
};

export const fetchVisitors = createAsyncThunk('visitor/fetchVisitors', async (params) => {
  const response = await visitorService.listVisitors(params);
  return response.data ?? response;
});

export const fetchApprovedVisitors = createAsyncThunk('visitor/fetchApprovedVisitors', async () => {
  const response = await visitorService.listApprovedVisitors();
  return response.data ?? response;
});

export const registerVisitor = createAsyncThunk('visitor/registerVisitor', async (payload) => {
  const response = await visitorService.createVisitor(payload);
  return response.data ?? response;
});

export const approveVisitor = createAsyncThunk('visitor/approveVisitor', async (visitorId) => {
  const response = await visitorService.approveVisitor(visitorId);
  return response.data ?? response;
});

export const updateVisitor = createAsyncThunk('visitor/updateVisitor', async ({ id, payload }) => {
  const response = await visitorService.updateVisitor(id, payload);
  return response.data ?? response;
});

export const deleteVisitor = createAsyncThunk('visitor/deleteVisitor', async (visitorId) => {
  await visitorService.deleteVisitor(visitorId);
  return visitorId;
});

export const fetchVisitorById = createAsyncThunk('visitor/fetchVisitorById', async (visitorId) => {
  const response = await visitorService.getVisitor(visitorId);
  return response.data ?? response;
});

export const fetchRegistrationsByInmate = createAsyncThunk('visitor/fetchRegistrationsByInmate', async (inmateId) => {
  const response = await registrationService.getVisitorsForInmate(inmateId);
  return { inmateId, payload: response.data ?? response };
});

export const linkVisitorToInmate = createAsyncThunk('visitor/linkVisitorToInmate', async (payload) => {
  const response = await registrationService.linkVisitorToInmate(payload);
  return response.data ?? response;
});

export const deactivateRegistration = createAsyncThunk('visitor/deactivateRegistration', async (registrationId) => {
  await registrationService.deactivateRegistration(registrationId);
  return registrationId;
});

const visitorSlice = createSlice({
  name: 'visitor',
  initialState,
  reducers: {
    clearVisitorError: (state) => {
      state.error = null;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVisitors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVisitors.fulfilled, (state, action) => {
        state.loading = false;
        state.visitors = action.payload?.data ?? action.payload ?? [];
        state.pagination = {
          page: action.payload?.meta?.current_page || action.payload?.current_page || state.pagination.page,
          pageSize: action.payload?.meta?.per_page || action.payload?.per_page || state.pagination.pageSize,
          total: action.payload?.meta?.total || action.payload?.total || state.pagination.total
        };
      })
      .addCase(fetchVisitors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load visitors';
      })
      .addCase(fetchApprovedVisitors.fulfilled, (state, action) => {
        state.approvedVisitors = action.payload?.data ?? action.payload ?? [];
      })
      .addCase(registerVisitor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerVisitor.fulfilled, (state, action) => {
        state.loading = false;
        const visitor = action.payload?.data ?? action.payload;
        if (visitor) state.visitors.unshift(visitor);
      })
      .addCase(registerVisitor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to register visitor';
      })
      .addCase(approveVisitor.fulfilled, (state, action) => {
        const approved = action.payload?.data ?? action.payload;
        if (!approved) return;
        state.visitors = state.visitors.map((v) => (v.id === approved.id ? approved : v));
      })
      .addCase(updateVisitor.fulfilled, (state, action) => {
        const updated = action.payload?.data ?? action.payload;
        if (!updated) return;
        state.visitors = state.visitors.map((v) => (v.id === updated.id ? updated : v));
        if (state.currentVisitor?.id === updated.id) state.currentVisitor = updated;
      })
      .addCase(deleteVisitor.fulfilled, (state, action) => {
        state.visitors = state.visitors.filter((visitor) => visitor.id !== action.payload);
      })
      .addCase(fetchVisitorById.fulfilled, (state, action) => {
        state.currentVisitor = action.payload?.data ?? action.payload;
      })
      .addCase(fetchRegistrationsByInmate.fulfilled, (state, action) => {
        state.registrations = action.payload.payload?.data ?? action.payload.payload ?? [];
        state.registrationMeta = {
          page: action.payload.payload?.current_page || action.payload.payload?.meta?.current_page || 1,
          pageSize: action.payload.payload?.per_page || action.payload.payload?.meta?.per_page || 15,
          total: action.payload.payload?.total || action.payload.payload?.meta?.total || state.registrations.length
        };
      })
      .addCase(linkVisitorToInmate.fulfilled, (state, action) => {
        const registration = action.payload?.data ?? action.payload;
        if (registration) state.registrations.unshift(registration);
      })
      .addCase(deactivateRegistration.fulfilled, (state, action) => {
        state.registrations = state.registrations.filter((reg) => reg.id !== action.payload);
      });
  }
});

export const { clearVisitorError, setPagination } = visitorSlice.actions;
export default visitorSlice.reducer;
