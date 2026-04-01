import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as activityService from '../services/activityService';

export const fetchActivities = createAsyncThunk('activity/fetchAll', async (filters) => {
  const response = await activityService.getActivities(filters);
  return response.data;
});

export const fetchCategories = createAsyncThunk('activity/fetchCategories', async () => {
  const response = await activityService.getCategories();
  return response.data;
});

export const fetchActivity = createAsyncThunk('activity/fetchOne', async (id) => {
  const response = await activityService.getActivity(id);
  return response.data;
});

export const createInternalActivity = createAsyncThunk('activity/createInternal', async (data) => {
  const response = await activityService.createInternalActivity(data);
  return response.data;
});

export const createExternalActivity = createAsyncThunk('activity/createExternal', async ({ activity, external }) => {
  const response = await activityService.createExternalActivity(activity, external);
  return response.data;
});

export const updateActivity = createAsyncThunk('activity/update', async ({ id, data }) => {
  const response = await activityService.updateActivity(id, data);
  return response.data;
});

export const updateExternalDetails = createAsyncThunk('activity/updateExternal', async ({ id, data }) => {
  const response = await activityService.updateExternalDetails(id, data);
  return response.data;
});

export const toggleActivityStatus = createAsyncThunk('activity/toggle', async ({ id, isActive }) => {
  const response = isActive ? await activityService.activateActivity(id) : await activityService.deactivateActivity(id);
  return response.data;
});

export const deleteActivity = createAsyncThunk('activity/delete', async (id) => {
  await activityService.deleteActivity(id);
  return id;
});

const activitySlice = createSlice({
  name: 'activity',
  initialState: {
    activities: [],
    categories: [],
    currentActivity: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivities.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchActivities.fulfilled, (state, action) => {
        state.loading = false;
        state.activities = action.payload?.data || [];
      })
      .addCase(fetchActivities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to load activities';
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload || [];
      })
      .addCase(fetchActivity.fulfilled, (state, action) => {
        state.currentActivity = action.payload || null;
      })
      .addCase(createInternalActivity.fulfilled, (state, action) => {
        if (action.payload?.data) state.activities.unshift(action.payload.data);
      })
      .addCase(createExternalActivity.fulfilled, (state, action) => {
        if (action.payload?.data) state.activities.unshift(action.payload.data);
      })
      .addCase(updateActivity.fulfilled, (state, action) => {
        const updated = action.payload?.data;
        if (!updated) return;
        const index = state.activities.findIndex((a) => a.id === updated.id);
        if (index !== -1) state.activities[index] = updated;
        if (state.currentActivity?.id === updated.id) state.currentActivity = updated;
      })
      .addCase(toggleActivityStatus.fulfilled, (state, action) => {
        const updated = action.payload?.data;
        if (!updated) return;
        const index = state.activities.findIndex((a) => a.id === updated.id);
        if (index !== -1) state.activities[index] = updated;
      })
      .addCase(deleteActivity.fulfilled, (state, action) => {
        state.activities = state.activities.filter((a) => a.id !== action.payload);
      });
  },
});

export const { clearError } = activitySlice.actions;
export default activitySlice.reducer;

