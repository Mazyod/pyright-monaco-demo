/*
 * Copyright (c) Eric Traut
 * A wrapper component for MUI icons that maintains consistent sizing and coloring.
 */

import { SvgIcon } from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ArrowDropDownCircleIcon from "@mui/icons-material/ArrowDropDownCircle";
import InfoIcon from "@mui/icons-material/Info";
import WarningIcon from "@mui/icons-material/Warning";

// Map of icon names to their MUI components
const iconMap = {
  "close-circle": CancelIcon,
  check: CheckIcon,
  close: CloseIcon,
  "down-circle": ArrowDropDownCircleIcon,
  "info-circle": InfoIcon,
  warning: WarningIcon,
} as const;

export type IconName = keyof typeof iconMap;

export interface MuiIconProps {
  name: IconName;
  size: number;
  color: string;
}

export function MuiIcon(props: MuiIconProps) {
  const IconComponent = iconMap[props.name];

  return (
    <SvgIcon
      component={IconComponent}
      sx={{
        width: props.size,
        height: props.size,
        color: props.color,
      }}
    />
  );
}
