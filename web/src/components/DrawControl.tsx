import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type {ControlPosition} from 'mapbox-gl';
import {useControl} from 'react-map-gl/mapbox';
import type {MapRef} from 'react-map-gl/mapbox';
import {useEffect} from "react";
import DirectSelectWithBoxMode from '../modes/DirectSelectWithBoxMode';

type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
    position?: ControlPosition;
    features?: GeoJSON.Feature[];
    editMode?: boolean;

    onCreate: (evt: { features: GeoJSON.Feature[] }) => void;
    onUpdate: (evt: { features: GeoJSON.Feature[]; action: string }) => void;
    onCombine: (evt: { createdFeatures: GeoJSON.Feature[]; deletedFeatures: GeoJSON.Feature[] }) => void;
    onDelete: (evt: { features: GeoJSON.Feature[] }) => void;
    onSelectionChange: (evt: { features: GeoJSON.Feature[] }) => void;
    onOpenDetails: (evt: { features: GeoJSON.Feature[] }) => void;
};

export default function DrawControl(props: DrawControlProps) {
    const mp = useControl<MapboxDraw>(
        () => new MapboxDraw({
            ...props,
            modes: {
                ...MapboxDraw.modes,
                direct_select: DirectSelectWithBoxMode
            }
        }),
        ({map}: {map: MapRef}) => {
            map.on('draw.create', props.onCreate);
            map.on('draw.update', props.onUpdate);
            map.on('draw.combine', props.onCombine);
            map.on('draw.delete', props.onDelete);
            map.on('draw.selectionchange', props.onSelectionChange);
            map.on('feature.open', props.onOpenDetails);
        },
        ({map}: {map: MapRef}) => {
            map.off('draw.create', props.onCreate);
            map.off('draw.update', props.onUpdate);
            map.off('draw.combine', props.onCombine);
            map.off('draw.delete', props.onDelete);
            map.off('draw.selectionchange', props.onSelectionChange);
            map.off('feature.open', props.onOpenDetails);
        }
        ,
        {
            position: props.position,
        }
    );
    useEffect(() => {
        if (mp) {
            if (props.features) {
                mp.deleteAll();
                props.features.forEach((f) => {
                    mp.add(f);
                })
            }
        }
    }, [mp, props.features]);
    useEffect(() => {
        if (mp) {
            // Always start in simple_select — user can draw via the polygon tool button.
            // Previously this switched to draw_polygon in edit mode, which caused the
            // first click to start drawing instead of selecting existing features.
            mp.changeMode('simple_select');
        }
    }, [mp, props.editMode]);
    return null;
}

DrawControl.defaultProps = {
    onCreate: () => {},
    onUpdate: () => {},
    onDelete: () => {},
    onCombine: () => {},
    onSelectionChange: () => {},
    onOpenDetails: () => {},
};
