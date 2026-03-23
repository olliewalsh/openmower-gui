import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type {ControlPosition} from 'mapbox-gl';
import {useControl} from 'react-map-gl/mapbox';
import type {MapRef} from 'react-map-gl/mapbox';
import {useEffect, useRef} from "react";
import type {MutableRefObject} from "react";
import DirectSelectWithBoxMode from '../modes/DirectSelectWithBoxMode';

type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
    position?: ControlPosition;
    features?: GeoJSON.Feature[];
    editMode?: boolean;
    drawRef?: MutableRefObject<MapboxDraw | null>;

    onCreate: (evt: { features: GeoJSON.Feature[] }) => void;
    onUpdate: (evt: { features: GeoJSON.Feature[]; action: string }) => void;
    onCombine: (evt: { createdFeatures: GeoJSON.Feature[]; deletedFeatures: GeoJSON.Feature[] }) => void;
    onDelete: (evt: { features: GeoJSON.Feature[] }) => void;
    onSelectionChange: (evt: { features: GeoJSON.Feature[] }) => void;
    onOpenDetails: (evt: { features: GeoJSON.Feature[] }) => void;
};

export default function DrawControl(props: DrawControlProps) {
    const {
        drawRef, features, editMode, position,
        onCreate, onUpdate, onCombine, onDelete, onSelectionChange, onOpenDetails,
        ...drawOptions
    } = props;
    const mp = useControl<MapboxDraw>(
        () => new MapboxDraw({
            ...drawOptions,
            modes: {
                ...MapboxDraw.modes,
                direct_select: DirectSelectWithBoxMode
            }
        }),
        ({map}: {map: MapRef}) => {
            map.on('draw.create', onCreate);
            map.on('draw.update', onUpdate);
            map.on('draw.combine', onCombine);
            map.on('draw.delete', onDelete);
            map.on('draw.selectionchange', onSelectionChange);
            map.on('feature.open', onOpenDetails);
        },
        ({map}: {map: MapRef}) => {
            map.off('draw.create', onCreate);
            map.off('draw.update', onUpdate);
            map.off('draw.combine', onCombine);
            map.off('draw.delete', onDelete);
            map.off('draw.selectionchange', onSelectionChange);
            map.off('feature.open', onOpenDetails);
        }
        ,
        {
            position,
        }
    );
    useEffect(() => {
        if (drawRef) {
            drawRef.current = mp ?? null;
        }
    }, [mp, drawRef]);
    // Sync features into MapboxDraw whenever they change.
    // Uses a delayed sync to handle React StrictMode's mount/unmount/remount cycle,
    // which causes useControl to remove and re-add the control (wiping its internal store).
    // By deferring, we ensure we write to the final, mounted instance.
    const syncTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const prevFeaturesKeyRef = useRef<string>('');
    useEffect(() => {
        if (!mp || !features) return;
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
            const key = JSON.stringify(features.map(f => [f.id, f.geometry]));
            if (key === prevFeaturesKeyRef.current && mp.getAll().features.length > 0) return;
            prevFeaturesKeyRef.current = key;
            mp.deleteAll();
            features.forEach((f) => {
                mp.add(f);
            });
        }, 0);
        return () => clearTimeout(syncTimerRef.current);
    }, [mp, features]);
    useEffect(() => {
        if (mp) {
            // Always start in simple_select — user can draw via the polygon tool button.
            // Previously this switched to draw_polygon in edit mode, which caused the
            // first click to start drawing instead of selecting existing features.
            mp.changeMode('simple_select');
        }
    }, [mp, editMode]);
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
