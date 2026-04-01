import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as dutyRosterService from '../services/dutyRosterService';

export const fetchRosters = createAsyncThunk('dutyRoster/fetchAll', async (filters) => {
  const response = await dutyRosterService.getRosters(filters);
  return response.data;
});

export const assignOfficer = createAsyncThunk('dutyRoster/assign', async (data) => {
  const response = await dutyRosterService.assignOfficer(data);
  return response.data;
});

export const autoAssign = createAsyncThunk('dutyRoster/autoAssign', async () => {
  const response = await dutyRosterService.autoAssign();
  return response.data;
});

export const deactivateRoster = createAsyncThunk('dutyRoster/deactivate', async (id) => {
  await dutyRosterService.deactivateRoster(id);
  return id;
});

export const deleteRoster = createAsyncThunk('dutyRoster/delete', async (id) => {
  await dutyRosterService.deleteRoster(id);
  return id;
});

export const fetchWeeklySummary = createAsyncThunk('dutyRoster/weeklySummary', async (weekStart) => {
  const response = await dutyRosterService.getWeeklySummary(weekStart);
  return response.data;
});

export const fetchCurrentOfficer = createAsyncThunk('dutyRoster/currentOfficer', async () => {
  const response = await dutyRosterService.getCurrentOfficer();
  return response.data;
});

const dutyRosterSlice = createSlice({
  name: 'dutyRoster',
  initialState: {
    rosters: [],
    currentWeekSummary: null,
    currentOfficer: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRosters.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRosters.fulfilled, (state, action) => {
        state.loading = false;
        state.rosters = action.payload?.data || [];
      })
      .addCase(fetchRosters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to load rosters';
      })
      .addCase(assignOfficer.fulfilled, (state, action) => {
        if (action.payload?.data) state.rosters.unshift(action.payload.data);
      })
      .addCase(autoAssign.rejected, (state, action) => {
        state.error = action.error?.message || 'Auto-assign failed';
      })
      .addCase(deactivateRoster.fulfilled, (state, action) => {
        const index = state.rosters.findIndex((r) => r.id === action.payload);
        if (index !== -1) state.rosters[index].is_active = false;
      })
      .addCase(deleteRoster.fulfilled, (state, action) => {
        state.rosters = state.rosters.filter((r) => r.id !== action.payload);
      })
      .addCase(fetchWeeklySummary.fulfilled, (state, action) => {
        state.currentWeekSummary = action.payload || null;
      });

    builder
      .addCase(fetchCurrentOfficer.fulfilled, (state, action) => {
        state.currentOfficer = action.payload || null;
      })
      .addCase(fetchCurrentOfficer.rejected, (state) => {
        state.currentOfficer = null;
      });
  },
});

export const { clearError } = dutyRosterSlice.actions;
export default dutyRosterSlice.reducer;
