import { useContext } from 'react';
import { ThemeContext } from './ThemeContextCreate';

export const useTheme = () => useContext(ThemeContext);
