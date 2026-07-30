const HTTP_ERROR_MAP: Record<number, string> = {
  400: '請求格式錯誤，請檢查輸入內容',
  401: '登入已過期，請重新登入',
  403: '您沒有權限執行此操作',
  404: '找不到請求的資源',
  409: '資料衝突，請重新整理後再試',
  422: '輸入資料驗證失敗',
  429: '請求過於頻繁，請稍後再試',
  500: '伺服器發生錯誤，請稍後再試',
};

const DEFAULT_ERROR = '發生未知錯誤，請稍後再試';

function getStatusCode(e: unknown): number | undefined {
  if (e != null && typeof e === 'object' && 'statusCode' in e) {
    const code = (e as { statusCode: unknown }).statusCode;
    if (typeof code === 'number') return code;
  }
  return undefined;
}

function getMessage(e: unknown): string | undefined {
  if (e != null && typeof e === 'object' && 'data' in e) {
    const data = (e as { data: unknown }).data;
    if (data != null && typeof data === 'object' && 'message' in data) {
      const message = (data as { message: unknown }).message;
      if (typeof message === 'string') return message;
    }
  }
  return undefined;
}

export function isSessionExpiredError(e: unknown): boolean {
  return getStatusCode(e) === 401 && getMessage(e) === 'Invalid or expired token';
}

export function handleError(e: unknown): string {
  const code = getStatusCode(e);
  return code !== undefined ? (HTTP_ERROR_MAP[code] ?? DEFAULT_ERROR) : DEFAULT_ERROR;
}

export function useApiError() {
  const { showError } = useToast();
  const { open: openSessionExpiredDialog } = useSessionExpiredDialog();

  async function withErrorToast<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (e) {
      if (isSessionExpiredError(e)) {
        openSessionExpiredDialog();
      } else {
        showError(handleError(e));
      }
      return null;
    }
  }

  return { handleError, withErrorToast };
}
