import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type {ControlPosition} from 'react-map-gl';
import {useControl} from 'react-map-gl';
import {useEffect} from "react";

type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
    position?: ControlPosition;
    features?: any[];
    editMode?: boolean;

    onCreate: (evt: any) => void;
    onUpdate: (evt: any) => void;
    onDelete: (evt: any) => void;
};

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

const mbClasses = MapboxDraw.constants.classes as Writeable<any>;
mbClasses.CONTROL_BASE  = 'maplibregl-ctrl';
mbClasses.CONTROL_PREFIX = 'maplibregl-ctrl-';
mbClasses.CONTROL_GROUP = 'maplibregl-ctrl-group';

export default function DrawControl(props: DrawControlProps) {
    const mp = useControl<MapboxDraw>(
        () => new MapboxDraw(props),
        ({map}) => {
            map.on('draw.create', props.onCreate);
            map.on('draw.update', props.onUpdate);
            map.on('draw.delete', props.onDelete);
        },
        ({map}) => {
            map.off('draw.create', props.onCreate);
            map.off('draw.update', props.onUpdate);
            map.off('draw.delete', props.onDelete);
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
            if (!props.editMode) {
                mp.changeMode('simple_select');
            } else {
                mp.changeMode('draw_polygon');
            }
        }
    }, [mp, props.editMode]);
    return null;
}

DrawControl.defaultProps = {
    onCreate: () => {
    },
    onUpdate: () => {
    },
    onDelete: () => {
    }
};