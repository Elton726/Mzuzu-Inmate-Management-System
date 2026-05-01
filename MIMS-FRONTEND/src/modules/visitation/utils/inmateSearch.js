export const getInmateSearchResults = (responseData) => {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
};

export const getInmateDisplayName = (inmate) => {
  const name = [inmate?.first_name, inmate?.other_names, inmate?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || inmate?.prison_number || 'Unnamed inmate';
};

export const getCurrentAdmission = (inmate) => inmate?.current_admission || inmate?.currentAdmission || null;
