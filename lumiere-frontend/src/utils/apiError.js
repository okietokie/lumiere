export function getApiErrorMessage(error, fallbackMessage) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item?.msg) {
          return item.msg;
        }
        return null;
      })
      .filter(Boolean)
      .join(" ");
  }

  if (typeof error?.response?.data?.message === "string" && error.response.data.message.trim()) {
    return error.response.data.message;
  }

  if (error?.message === "Network Error") {
    return "Unable to reach the server. Please check your connection and try again.";
  }

  return fallbackMessage;
}
