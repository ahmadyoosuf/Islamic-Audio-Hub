import colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

export function useColors() {
  const { isDarkMode } = useApp();
  const palette =
    isDarkMode && "dark" in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius, isDark: isDarkMode };
}
