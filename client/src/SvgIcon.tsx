/*
 * Copyright (c) Eric Traut
 * An icon rendered using an SVG image.
 */

import { renderIconDefinitionToSVGElement } from '@ant-design/icons-svg/es/helpers';
import { IconDefinition } from '@ant-design/icons-svg/lib/types';

export interface SvgIconProps {
    iconDefinition: IconDefinition;
    iconSize: number;
    color: string;
}

export function SvgIcon(props: SvgIconProps) {
    const svgElement = renderIconDefinitionToSVGElement(props.iconDefinition, {
        extraSVGAttrs: {
            width: `${props.iconSize}px`,
            height: `${props.iconSize}px`,
            fill: props.color,
        },
    });

    return (
        <div className="svg-icon-container">
            <div
                className="svg-icon"
                style={{
                    height: props.iconSize,
                    width: props.iconSize,
                }}
                dangerouslySetInnerHTML={{ __html: svgElement }}
            />
        </div>
    );
}

// CSS classes should be defined in your CSS file:
// .svg-icon-container {
//     display: flex;
//     justify-content: center;
// }
// 
// .svg-icon {
//     display: flex;
//     align-items: center;
//     justify-content: center;
// }
