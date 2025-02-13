import { useCallback, useRef } from 'react';

function useDebounce<T extends (...args: Parameters<T>) => void>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                func(...args);
            }, delay);
        },
        [func, delay]
    );
}

export default useDebounce;
