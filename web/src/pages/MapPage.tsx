import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import {useApi} from "../hooks/useApi.ts";
import {App} from "antd";
import {useWS} from "../hooks/useWS.ts";
import centroid from "@turf/centroid";
import turfArea from "@turf/area";
import union from "@turf/union";
import difference from "@turf/difference";
import {featureCollection} from "@turf/helpers"
import React, {ChangeEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {AbsolutePose, LaserScan, Map as MapType, MapArea, Marker, MarkerArray, Path} from "../types/ros.ts";
import DrawControl from "../components/DrawControl.tsx";
import Map, {Layer, Source} from 'react-map-gl/mapbox';
import type {Map as MapboxMap} from 'mapbox-gl';
import type {Feature} from 'geojson';
import {FeatureCollection, Polygon, Position} from "geojson";
import {useMowerAction} from "../components/MowerActions.tsx";
import {MowerMapMapArea,MowerReplaceMapSrvReq} from "../api/Api.ts";
import {MapStyle} from "./MapStyle.tsx";
import {converter, dedupePoints, drawLine, getQuaternionFromHeading, itranspose, transpose} from "../utils/map.tsx";
import {useHighLevelStatus} from "../hooks/useHighLevelStatus.ts";
import {useSettings} from "../hooks/useSettings.ts";
import {useConfig} from "../hooks/useConfig.tsx";
import {useEnv} from "../hooks/useEnv.tsx";
import {Spinner} from "../components/Spinner.tsx";
import {MowingFeature, MowingAreaFeature, MowerFeatureBase, DockFeatureBase, MowingFeatureBase, LineFeatureBase, NavigationFeature, ObstacleFeature, ActivePathFeature, PathFeature} from "../types/map.ts";
import {MowingAreaEdit} from "./map/utils/types.ts";
import {useMapEditHistory} from "./map/hooks/useMapEditHistory.ts";
import {useMapOffset} from "./map/hooks/useMapOffset.ts";
import {useManualMode} from "./map/hooks/useManualMode.ts";
import {NewAreaModal} from "./map/components/NewAreaModal.tsx";
import {EditAreaModal} from "./map/components/EditAreaModal.tsx";
import {AreasListPanel} from "./map/components/AreasListPanel.tsx";
import {MapOffsetPanel} from "./map/components/MapOffsetPanel.tsx";
import {MapToolbar} from "./map/components/MapToolbar.tsx";
import {MapToolbarMobile} from "./map/components/MapToolbarMobile.tsx";
import {MapEditorToolbar} from "./map/components/MapEditorToolbar.tsx";
import {JoystickOverlay} from "./map/components/JoystickOverlay.tsx";
import {useIsMobile} from "../hooks/useIsMobile.ts";


export const MapPage: React.FC<{compact?: boolean}> = ({compact = false}) => {
    const {notification} = App.useApp();
    const isMobile = useIsMobile();
    const mowerAction = useMowerAction()
    const highLevelStatus = useHighLevelStatus()
    const [modalOpen, setModalOpen] = useState<boolean>(false)
    const [areaModelOpen, setAreaModelOpen] = useState<boolean>(false)

    // State for the "new area" creation modal
    const [newAreaName, setNewAreaName] = useState<string>('')
    const [newAreaType, setNewAreaType] = useState<'workarea' | 'navigation' | 'obstacle'>('workarea')

    const [currentFeature, setCurrentFeature] = useState<Feature | undefined>(undefined)
    const [curMowingAreaFeature, setCurMowingAreaFeature] = useState<MowingAreaEdit>(new MowingAreaEdit())
    const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([])
    const [splitTargetId, setSplitTargetId] = useState<string | null>(null)

    const {settings} = useSettings()
    const [labelsCollection, setLabelsCollection] = useState<FeatureCollection>({
        type: "FeatureCollection",
        features: []
    })
    const {config, setConfig} = useConfig(["gui.map.offset.x", "gui.map.offset.y"])
    const envs = useEnv()
    const guiApi = useApi()
    const [tileUri, setTileUri] = useState<string | undefined>()
    const [editMap, setEditMap] = useState<boolean>(false)
    const [features, setFeatures] = useState<Record<string, MowingFeature>>({});
    const [mapKey, setMapKey] = useState<string>("origin")
    const [map, setMap] = useState<MapType | undefined>(undefined)
    const [path, setPath] = useState<MarkerArray | undefined>(undefined)
    const [plan, setPlan] = useState<Path | undefined>(undefined)
    const [useSatellite, setUseSatellite] = useState(true)
    const robotPoseRef = useRef<{ x: number; y: number; heading: number } | null>(null)
    const mapInstanceRef = useRef<MapboxMap | null>(null)
    const drawRef = useRef<import('@mapbox/mapbox-gl-draw').default | null>(null);

    // Only include editable polygon features for DrawControl — exclude mower,
    // paths, and other display-only features so that frequent pose updates don't
    // trigger DrawControl to deleteAll() + re-add, which wipes out selection state.
    const drawableFeatures = useMemo(
        () => Object.values(features).filter(f => f instanceof MowingFeatureBase),
        [features]
    );

    // Display-only features (mower, dock, heading, paths) rendered as separate layers
    const displayFeatures = useMemo<GeoJSON.FeatureCollection>(() => ({
        type: "FeatureCollection",
        features: Object.values(features)
            .filter(f => !(f instanceof MowingFeatureBase))
            .map(f => ({
                type: "Feature" as const,
                id: f.id,
                geometry: f.geometry,
                properties: f.properties,
            })),
    }), [features]);

    // Extracted hooks
    const {offsetX, offsetY, handleOffsetX, handleOffsetY} = useMapOffset({config, setConfig, notification});

    const _datumLon = parseFloat(settings["OM_DATUM_LONG"] ?? 0)
    const _datumLat = parseFloat(settings["OM_DATUM_LAT"] ?? 0)
    const [map_ne, map_sw, datum] = useMemo<[[number, number], [number, number], [number, number, number]]>(() => {
        if (_datumLon == 0 || _datumLat == 0) {
            return [[0, 0], [0, 0], [0, 0, 0]]
        }
        const datum: [number, number, number] = [0, 0, 0]
        converter.LLtoUTM(_datumLat, _datumLon, datum)
        const map_center = (map && map.MapCenterY && map.MapCenterX) ? transpose(offsetX, offsetY, datum, map.MapCenterY, map.MapCenterX) : [_datumLon, _datumLat]
        const center: [number, number, number] = [0, 0, 0]
        converter.LLtoUTM(map_center[1], map_center[0], center)
        const map_sw = transpose(offsetX, offsetY, center, -((map?.MapHeight ?? 10) / 2), -((map?.MapWidth ?? 10) / 2))
        const map_ne = transpose(offsetX, offsetY, center, ((map?.MapHeight ?? 10) / 2), ((map?.MapWidth ?? 10) / 2))
        return [map_ne, map_sw, datum]
    }, [_datumLat, _datumLon, map, offsetX, offsetY])

    const {
        hasUnsavedChanges, setHasUnsavedChanges, handleEditMap,
        handleUndo, handleRedo, historyIndex, editHistory,
    } = useMapEditHistory({features, setFeatures, editMap, setEditMap});
    const [lidarCollection, setLidarCollection] = useState<GeoJSON.FeatureCollection>({
        type: "FeatureCollection",
        features: []
    })

    // Keep lidar layer on top of draw layers
    useEffect(() => {
        const m = mapInstanceRef.current
        if (!m) return
        try {
            if (m.getLayer('lidar-points')) {
                m.moveLayer('lidar-points')
            }
        } catch { /* layer may not exist yet */ }
    }, [lidarCollection])
    const mowingToolWidth = parseFloat(settings["OM_TOOL_WIDTH"] ?? "0.13") * 100;
    const [mowingAreas, setMowingAreas] = useState<{ key: string, label: string, feat: Feature }[]>([])
    const poseStream = useWS<string>(() => {
            console.log({
                message: "Pose Stream closed",
            })
        }, () => {
            console.log({
                message: "Pose Stream connected",
            })
        },
        (e) => {
            const pose = JSON.parse(e) as AbsolutePose
            const mower_lonlat = transpose(offsetX, offsetY, datum, pose.Pose?.Pose?.Position?.Y!!, pose.Pose?.Pose?.Position?.X!!)
            robotPoseRef.current = {
                x: pose.Pose?.Pose?.Position?.X ?? 0,
                y: pose.Pose?.Pose?.Position?.Y ?? 0,
                heading: pose.MotionHeading ?? 0,
            }
            setFeatures(oldFeatures => {
                let orientation = pose.MotionHeading!!;
                const line = drawLine(offsetX, offsetY, datum, pose.Pose?.Pose?.Position?.Y!!, pose.Pose?.Pose?.Position?.X!!, orientation);
                return {
                    ...oldFeatures, mower: new MowerFeatureBase(mower_lonlat)
                    , ['mower-heading']: new LineFeatureBase("mower-heading", [mower_lonlat, line],'#ff0000','heading')
                }
            })
        });

    const mapStream = useWS<string>(() => {
            console.log({
                message: "MAP Stream closed",
            })
        }, () => {
            console.log({
                message: "MAP Stream connected",
            })
        },
        (e) => {
            let parse = JSON.parse(e) as MapType;
            if(console.debug)
                console.debug(parse);
            setMap(parse)
            setMapKey("live")
        });

    const pathStream = useWS<string>(() => {
            console.log({
                message: "PATH Stream closed",
            })
        }, () => {
            console.log({
                message: "PATH Stream connected",
            })
        },
        (e) => {
            let parse = JSON.parse(e) as MarkerArray;
            setPath(parse)
        });
    const planStream = useWS<string>(() => {
            console.log({
                message: "PLAN Stream closed",
            })
        }, () => {
            console.log({
                message: "PLAN Stream connected",
            })
        },
        (e) => {
            let parse = JSON.parse(e) as Path;
            setPlan(parse)
        });
    const mowingPathStream = useWS<string>(() => {
            console.log({
                message: "Mowing PATH Stream closed",
            })
        }, () => {
            console.log({
                message: "Mowing PATH Stream connected",
            })
        },
        (e) => {
            const mowingPaths = JSON.parse(e) as Path[];
            setFeatures(oldFeatures => {
                const newFeatures = {...oldFeatures};
                mowingPaths.forEach((mowingPath, index) => {
                    if (mowingPath?.Poses) {
                        const line = mowingPath.Poses.map((pose) => {
                            return transpose(offsetX, offsetY, datum, pose.Pose?.Position?.Y!, pose.Pose?.Position?.X!)
                        });
                        newFeatures["mowingPath-" + index.toString()] = new PathFeature("mowingPath-" + index.toString(), line, `rgba(107, 255, 188, 0.68)`, mowingToolWidth);
                    }
                })
                return newFeatures
            })
        });

    const joyStream = useWS<string>(() => {
            console.log({
                message: "Joystick Stream closed",
            })
        }, () => {
            console.log({
                message: "Joystick Stream connected",
            })
        },
        () => {
        });

    const lidarStream = useWS<string>(() => {
            console.log({ message: "Lidar Stream closed" })
        }, () => {
            console.log({ message: "Lidar Stream connected" })
        },
        (e) => {
            const scan = JSON.parse(e) as LaserScan
            const pose = robotPoseRef.current
            if (!pose || !scan.Ranges) return

            const rays: GeoJSON.Feature[] = []
            const angleMin = scan.AngleMin ?? 0
            const angleInc = scan.AngleIncrement ?? 0
            const rangeMin = scan.RangeMin ?? 0
            const rangeMax = scan.RangeMax ?? 12

            // Downsample: take every Nth point for performance
            const step = Math.max(1, Math.floor(scan.Ranges.length / 90))
            for (let i = 0; i < scan.Ranges.length; i += step) {
                const range = scan.Ranges[i]
                if (range < rangeMin || range > rangeMax) continue

                const angle = angleMin + i * angleInc + pose.heading
                const endX = pose.x + range * Math.cos(angle)
                const endY = pose.y + range * Math.sin(angle)
                const endLonLat = transpose(offsetX, offsetY, datum, endY, endX)

                rays.push({
                    type: "Feature",
                    properties: { intensity: range < rangeMax * 0.8 ? 'hit' : 'far' },
                    geometry: {
                        type: "Point",
                        coordinates: endLonLat
                    }
                })
            }
            setLidarCollection({
                type: "FeatureCollection",
                features: rays
            })
        });

    useEffect(() => {
        if (envs) {
            setTileUri(envs.tileUri)
        }
    }, [envs]);

    useEffect(() => {
        if (editMap) {
            mapStream.stop()
            poseStream.stop()
            pathStream.stop()
            planStream.stop()
            mowingPathStream.stop()
            lidarStream.stop()
            highLevelStatus.stop()
            setPath(undefined)
            setPlan(undefined)
            setLidarCollection({ type: "FeatureCollection", features: [] })
        } else {
            if (settings["OM_DATUM_LONG"] == undefined || settings["OM_DATUM_LAT"] == undefined) {
                return
            }
            highLevelStatus.start("/api/openmower/subscribe/highLevelStatus")
            poseStream.start("/api/openmower/subscribe/pose",)
            mapStream.start("/api/openmower/subscribe/map",)
            pathStream.start("/api/openmower/subscribe/path")
            planStream.start("/api/openmower/subscribe/plan")
            mowingPathStream.start("/api/openmower/subscribe/mowingPath")
            lidarStream.start("/api/openmower/subscribe/lidar")
        }
    }, [editMap])
    useEffect(() => {
        if (highLevelStatus.highLevelStatus.StateName == "AREA_RECORDING") {
            joyStream.start("/api/openmower/publish/joy")
            setEditMap(false)
            return
        }
        joyStream.stop()
    }, [highLevelStatus.highLevelStatus.StateName])

    useEffect(() => {
        if (settings["OM_DATUM_LONG"] == undefined || settings["OM_DATUM_LAT"] == undefined) {
            return
        }
        highLevelStatus.start("/api/openmower/subscribe/highLevelStatus")
        poseStream.start("/api/openmower/subscribe/pose",)
        mapStream.start("/api/openmower/subscribe/map",)
        pathStream.start("/api/openmower/subscribe/path")
        planStream.start("/api/openmower/subscribe/plan")
        mowingPathStream.start("/api/openmower/subscribe/mowingPath")
        lidarStream.start("/api/openmower/subscribe/lidar")
    }, [settings]);

    useEffect(() => {
        return () => {
            poseStream.stop()
            mapStream.stop()
            pathStream.stop()
            joyStream.stop()
            planStream.stop()
            mowingPathStream.stop()
            lidarStream.stop()
            highLevelStatus.stop()
        }
    }, [])

    const buildLabels = (param: MowingFeature[]) => {
        return param.flatMap((feature) => {

            if (!(feature instanceof MowingAreaFeature)) {
                return []
            }
            // Skip features with empty or invalid geometry
            if (!feature.geometry?.coordinates?.[0]?.length) {
                return []
            }
            const centroidPt = centroid(feature);
            if (centroidPt.properties != null) {
                const areaSqm = turfArea(feature);
                const areaLabel = areaSqm >= 10000
                    ? `${(areaSqm / 10000).toFixed(2)} ha`
                    : `${areaSqm.toFixed(0)} m²`;
                centroidPt.properties.title = feature.getLabel() + `\n${areaLabel}`;
                centroidPt.properties.index = feature.getIndex()
            }
            centroidPt.id = feature.id
            return [centroidPt];
        })
    };
    useEffect(() => {
        let newFeatures: Record<string, MowingFeature> = {}
        if (map) {
            const workingAreas = buildFeatures(map.WorkingArea??[], "area")
            const navigationAreas = buildFeatures(map.NavigationAreas??[], "navigation")
            newFeatures = {...workingAreas, ...navigationAreas}
            

            const dock_lonlat = transpose(offsetX, offsetY, datum, map?.DockY!!, map?.DockX!!)
            newFeatures["dock"] = new DockFeatureBase(dock_lonlat);


        }
        if (path) {
            Object.values<Marker>(path.Markers).filter((f) => {
                return f.Type == 4 && f.Action == 0
            }).forEach((marker, index) => {
                const line: Position[] = marker.Points?.map(point => {
                    return transpose(offsetX, offsetY, datum, point.Y!!, point.X!!)
                })

                const feature = new PathFeature("path-" + index.toString(), line, `rgba(${marker.Color.R * 255}, ${marker.Color.G * 255}, ${marker.Color.B * 255}, ${marker.Color.A * 255})`);
                newFeatures[feature.id] = feature

            })
        }
        if (plan?.Poses) {
            const coordinates = plan.Poses.map((pose) => {
                return transpose(offsetX, offsetY, datum, pose.Pose?.Position?.Y!, pose.Pose?.Position?.X!)
            });
            const feature = new ActivePathFeature("plan", coordinates);
            newFeatures[feature.id] = feature
        }
        if (console.debug) {
            console.debug("Set new features");
            console.debug(newFeatures);
        }
        setFeatures(newFeatures)
    }, [map, path, plan, offsetX, offsetY, datum]);

    useEffect(() => {
        const labels = buildLabels(Object.values(features))
        setLabelsCollection({
            type: "FeatureCollection",
            features: labels
        });
        setMowingAreas(labels.flatMap(feat => {
            if (feat.properties?.title == undefined) {
                return []
            }
            return [{
                key: feat.id as string,
                label: feat.properties.title,
                feat: feat
            }]
        }))
    }, [features]);

    // Build the areas list for the sidebar panel
    const areasList = useMemo(() => {
        const polygons = Object.values(features).filter(
            (f): f is MowingFeatureBase => f instanceof MowingFeatureBase
        );
        return polygons
            .sort((a, b) => {
                // workareas first, then navigation, then obstacles
                const typeOrder: Record<string, number> = { workarea: 0, navigation: 1, obstacle: 2 };
                const ta = typeOrder[a.properties.feature_type] ?? 3;
                const tb = typeOrder[b.properties.feature_type] ?? 3;
                if (ta !== tb) return ta - tb;
                return (a.properties.mowing_order ?? 0) - (b.properties.mowing_order ?? 0);
            })
            .map((f) => {
                const areaSqm = turfArea(f);
                const areaLabel = areaSqm >= 10000
                    ? `${(areaSqm / 10000).toFixed(2)} ha`
                    : `${areaSqm.toFixed(0)} m²`;
                const ftype = f.properties.feature_type;
                let name = '';
                if (f instanceof MowingAreaFeature) {
                    name = f.getLabel();
                } else if (f instanceof NavigationFeature) {
                    name = `Navigation ${f.id}`;
                } else if (f instanceof ObstacleFeature) {
                    name = `Obstacle ${f.id}`;
                }
                const mowingOrder = f instanceof MowingAreaFeature ? f.getMowingOrder() : undefined;
                return { id: f.id, name, ftype, areaLabel, mowingOrder };
            });
    }, [features]);

    function buildFeatures(areas: MapArea[], type: string) : Record<string, MowingFeatureBase> {


        return areas?.flatMap((area, index) : MowingFeatureBase[] => {
            if (!area.Area?.Points?.length) {
                return []
            }

            const nfeat = type=="area" ? new MowingAreaFeature(type + "-" + index.toString() + "-area-0", index+1)
                : new NavigationFeature(type + "-" + index.toString() + "-area-0");//, offsetX, offsetY, datum.
            nfeat.setArea(area, offsetX, offsetY, datum);

            let obstacles:  ObstacleFeature[] = [];

            if ((nfeat instanceof MowingAreaFeature) && (area.Obstacles))
                obstacles = area.Obstacles.map((obstacle, oindex) => {
                const nobst =  new ObstacleFeature(
                    type + "-" + index.toString() + "-obstacle-" + oindex.toString(),
                    nfeat
                );
                
                if (obstacle.Points)
                    nobst.transpose(obstacle.Points, offsetX, offsetY, datum);

                return nobst;

            })
            return [nfeat, ...obstacles ]
        }).reduce((acc, val) :Record<string, MowingFeatureBase> => {
            if (val.id == undefined) {
                return acc
            }
            acc[val.id] = val;
            return acc;
        }, {} as Record<string, MowingFeatureBase>);
    }

  


    function getNewId(currFeatures: Record<string, MowingFeature>, type: string, index: string | null, component: string) {
        let maxArea = 0
        if (index != null) {
            maxArea = parseInt(index) - 1
        } else {
            maxArea = Object.values<MowingFeature>(currFeatures).filter((f) => {
                const idDetails = (f.id).split("-")
                if (idDetails.length != 4) {
                    return false
                }
                const areaType = idDetails[0]
                const areaComponent = idDetails[2]
                return areaType == type && component == areaComponent
            }).reduce((acc, val) => {
                const idDetails = (val.id).split("-")
                if (idDetails.length != 4) {
                    return acc
                }
                const index = parseInt(idDetails[1])
                if (index > acc) {
                    return index
                }
                return acc
            }, 0)
        }
        const maxComponent = Object.values<MowingFeature>(currFeatures).filter((f) => {
            return (f.id).startsWith(type + "-" + (maxArea + 1).toString() + "-" + component + "-")
        }).reduce((acc, val) => {
            const idDetails = (val.id).split("-")
            if (idDetails.length != 4) {
                return acc
            }
            const index = parseInt(idDetails[3])
            if (index > acc) {
                return index
            }
            return acc
        }, 0)
        return type + "-" + (maxArea + 1).toString() + "-" + component + "-" + (maxComponent + 1).toString();
    }


    function addArea<T extends MowingFeatureBase>(type: string, component: string, constructcb: (id: string) => T|null, new_feature: Feature<Polygon>|undefined=undefined) {
         let f;

        if (new_feature== undefined)
            f = currentFeature;
        else
            f = new_feature;

        if (f == undefined) {
            return
        }

        if (f.geometry.type != 'Polygon')
            return;

        setFeatures(currFeatures => {
            const id = getNewId(currFeatures, type, null, component);
            const nfeat =  constructcb(id);
            if (!nfeat) {
                return features;
            }
            nfeat.setGeometry((f as Feature<Polygon>).geometry)

            return {...currFeatures, [id]: nfeat};
        })
        setCurrentFeature(undefined)
        setModalOpen(false)
    }

    function addObstacle(new_feature: Feature<Polygon>|undefined=undefined) {


        addArea<ObstacleFeature>("area", "obstacle", (id) => {
            const currentLayerCoordinates = (currentFeature as Feature<Polygon>).geometry.coordinates[0]
            // find the area that contains the obstacle
            const area = Object.values<MowingFeature>(features).find((f) => {
                if (!(f instanceof MowingAreaFeature)) {
                    return false
                }
                const areaCoordinates = f.geometry.coordinates[0]
                return inside(currentLayerCoordinates, areaCoordinates)
            })
            if (!area) {
                notification.info({
                    message: "Unable to match an area for this obstacle"});
                return null;
            }

            return  new ObstacleFeature(id, area as MowingAreaFeature);
        }, new_feature);
    }

    function addNavigationArea(new_feature: Feature<Polygon>|undefined=undefined) {
        addArea<NavigationFeature>("navigation", "area", (id) => {
            return  new NavigationFeature(id);
        }, new_feature);
    }

    function handleSaveNewArea() {
        switch (newAreaType) {
            case 'workarea':
                // Set name after adding (addMowingArea resolves ID via setFeatures)
                setFeatures(currFeatures => {
                    const id = getNewId(currFeatures, "area", null, "area");
                    const nfeat = new MowingAreaFeature(id, mowingAreas.length + 1);
                    if (currentFeature && currentFeature.geometry.type === 'Polygon') {
                        nfeat.setGeometry((currentFeature as Feature<Polygon>).geometry);
                    }
                    if (newAreaName.trim()) {
                        nfeat.setName(newAreaName.trim());
                    }
                    return {...currFeatures, [id]: nfeat};
                });
                setCurrentFeature(undefined);
                setModalOpen(false);
                break;
            case 'navigation':
                addNavigationArea();
                break;
            case 'obstacle':
                addObstacle();
                break;
        }
    }

    const inside = (currentLayerCoordinates: Position[], areaCoordinates: Position[]) => {
        let inside = false;
        let j = areaCoordinates.length - 1;
        for (let i = 0; i < areaCoordinates.length; i++) {
            const xi = areaCoordinates[i][0];
            const yi = areaCoordinates[i][1];
            const xj = areaCoordinates[j][0];
            const yj = areaCoordinates[j][1];

            const intersect = ((yi > currentLayerCoordinates[1][1]) !== (yj > currentLayerCoordinates[1][1]))
                && (currentLayerCoordinates[1][0] < (xj - xi) * (currentLayerCoordinates[1][1] - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
            j = i;
        }
        return inside;
    };

    function deleteFeature() {
        if (currentFeature == undefined) {
            return
        }
        setFeatures(currFeatures => {
            const newFeatures = {...currFeatures};
            delete newFeatures[currentFeature.id!!]
            return newFeatures
        })
        setCurrentFeature(undefined)
        setModalOpen(false)
    }

    // Segment-segment intersection (returns point or null)
    const segSegIntersect = (
        a1: Position, a2: Position, b1: Position, b2: Position
    ): Position | null => {
        const d1x = a2[0] - a1[0], d1y = a2[1] - a1[1];
        const d2x = b2[0] - b1[0], d2y = b2[1] - b1[1];
        const cross = d1x * d2y - d1y * d2x;
        if (Math.abs(cross) < 1e-15) return null; // parallel
        const t = ((b1[0] - a1[0]) * d2y - (b1[1] - a1[1]) * d2x) / cross;
        const u = ((b1[0] - a1[0]) * d1y - (b1[1] - a1[1]) * d1x) / cross;
        if (t < 0 || t > 1 || u < 0 || u > 1) return null; // outside segments
        return [a1[0] + t * d1x, a1[1] + t * d1y];
    };

    // Get cutter line points between two intersection points (for multi-segment cuts)
    const getCutterBetween = (
        coords: number[][], p0: Position, p1: Position
    ): Position[] => {
        // For a simple 2-point line, there are no intermediate points
        // For multi-segment lines, find points between the two intersections
        const result: Position[] = [];
        let inside = false;
        const dist = (a: Position, b: Position) => Math.hypot(a[0] - b[0], a[1] - b[1]);
        for (const c of coords) {
            const d0 = dist(c, p0), d1 = dist(c, p1);
            if (d0 < 1e-12 || d1 < 1e-12) {
                if (inside) { inside = false; break; }
                inside = true;
                continue;
            }
            if (inside) result.push(c);
        }
        return result;
    };

    const performSplit = useCallback((lineFeature: Feature, targetId: string) => {
        const targetFeat = features[targetId];
        if (!targetFeat || !(targetFeat instanceof MowingFeatureBase) || targetFeat.geometry.type !== 'Polygon') {
            notification.error({message: 'Split target is not a valid polygon'});
            return;
        }

        // Algorithm from openmower-app: polygonize approach
        // 1. Convert polygon boundary to a line
        // 2. Find intersections between polygon boundary and cutting line
        // 3. Insert intersection points into both lines
        // 4. Polygonize the combined line network
        // 5. Filter resulting polygons to those inside the original
        const polygon: Feature<Polygon> = {
            type: 'Feature',
            properties: {},
            geometry: targetFeat.geometry as Polygon,
        };
        // Extend the cutting line far beyond the polygon so it fully crosses through
        const rawCutCoords = (lineFeature.geometry as GeoJSON.LineString).coordinates;
        const cutCoords = rawCutCoords.map(c => [Number(c[0]), Number(c[1])]);
        const polyCoords = (targetFeat.geometry as Polygon).coordinates[0];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const c of polyCoords) {
            if (c[0] < minX) minX = c[0]; if (c[1] < minY) minY = c[1];
            if (c[0] > maxX) maxX = c[0]; if (c[1] > maxY) maxY = c[1];
        }
        const pad = Math.max(maxX - minX, maxY - minY) * 3;
        // Extend first point backward
        const c0 = cutCoords[0], c1 = cutCoords[1];
        const dxS = c1[0] - c0[0], dyS = c1[1] - c0[1];
        const lenS = Math.sqrt(dxS * dxS + dyS * dyS);
        if (lenS > 0) {
            cutCoords[0] = [c0[0] - dxS / lenS * pad, c0[1] - dyS / lenS * pad];
        }
        // Extend last point forward
        const cL = cutCoords[cutCoords.length - 1], cP = cutCoords[cutCoords.length - 2];
        const dxE = cL[0] - cP[0], dyE = cL[1] - cP[1];
        const lenE = Math.sqrt(dxE * dxE + dyE * dyE);
        if (lenE > 0) {
            cutCoords[cutCoords.length - 1] = [cL[0] + dxE / lenE * pad, cL[1] + dyE / lenE * pad];
        }


        try {
            // Get the polygon ring (without closing duplicate)
            const ring = (polygon.geometry as Polygon).coordinates[0];
            const ringOpen = ring.slice(0, -1); // remove closing point

            // Find where the cutter line intersects each edge of the polygon
            const hits: {index: number; point: Position}[] = [];
            for (let i = 0; i < ringOpen.length; i++) {
                const a = ringOpen[i];
                const b = ringOpen[(i + 1) % ringOpen.length];
                const pt = segSegIntersect(a, b, cutCoords[0], cutCoords[cutCoords.length - 1]);
                if (pt) hits.push({index: i, point: pt});
            }

            if (hits.length < 2) {
                notification.error({message: 'Line must cross the area at least twice to split it'});
                return;
            }

            // Sort hits by index so we walk the ring in order
            hits.sort((a, b) => a.index - b.index);
            const h0 = hits[0];
            const h1 = hits[1];

            // Build two polygons by walking the ring in two halves connected by the cut
            // Polygon A: from h0.point along ring to h1.point, then back via cut
            const polyACoords: Position[] = [h0.point];
            for (let i = h0.index + 1; i <= h1.index; i++) {
                polyACoords.push(ringOpen[i]);
            }
            polyACoords.push(h1.point);
            // Add cutter line points between the two intersections (if multi-segment)
            const cutBetween = getCutterBetween(cutCoords, h0.point, h1.point);
            polyACoords.push(...[...cutBetween].reverse());
            polyACoords.push(h0.point); // close

            // Polygon B: from h1.point along ring (wrapping) to h0.point, then back via cut
            const polyBCoords: Position[] = [h1.point];
            for (let i = h1.index + 1; i < ringOpen.length + h0.index + 1; i++) {
                polyBCoords.push(ringOpen[i % ringOpen.length]);
            }
            polyBCoords.push(h0.point);
            polyBCoords.push(...cutBetween);
            polyBCoords.push(h1.point); // close

            const geomA: GeoJSON.Polygon = {type: 'Polygon', coordinates: [polyACoords]};
            const geomB: GeoJSON.Polygon = {type: 'Polygon', coordinates: [polyBCoords]};

            setFeatures(curr => {
                const next = {...curr};
                const origFeat = next[targetId];
                if (origFeat && origFeat instanceof MowingFeatureBase) {
                    origFeat.setGeometry(geomA);
                }

                const areaType = targetFeat.properties.feature_type;
                let type: string;
                let constructFn: (id: string) => MowingFeatureBase | null;
                switch (areaType) {
                    case 'workarea':
                        type = 'area';
                        constructFn = (id) => new MowingAreaFeature(id, mowingAreas.length + 1);
                        break;
                    case 'navigation':
                        type = 'navigation';
                        constructFn = (id) => new NavigationFeature(id);
                        break;
                    case 'obstacle': {
                        type = 'area';
                        const parentArea = Object.values<MowingFeature>(next).find(
                            (f): f is MowingAreaFeature => f instanceof MowingAreaFeature
                        );
                        if (!parentArea) {
                            notification.error({message: 'No parent area found for obstacle split'});
                            return curr;
                        }
                        constructFn = (id) => new ObstacleFeature(id, parentArea);
                        break;
                    }
                    default:
                        notification.error({message: `Unknown type ${areaType}`});
                        return curr;
                }
                const component = areaType === 'obstacle' ? 'obstacle' : 'area';
                const newId = getNewId(next, type, null, component);
                const newFeat = constructFn(newId);
                if (newFeat) {
                    newFeat.setGeometry(geomB);
                    next[newId] = newFeat;
                    sortFeatures(next);
                }

                return next;
            });

            if (drawRef.current) {
                const drawFeat = drawRef.current.get(targetId);
                if (drawFeat) {
                    drawFeat.geometry = geomA;
                    drawRef.current.add(drawFeat);
                }
            }
            notification.success({message: 'Area split into 2 pieces'});
        } catch (err) {
            notification.error({message: `Split failed: ${err instanceof Error ? err.message : String(err)}`});
        }
    }, [features, mowingAreas.length, notification]);

    const splitInProgressRef = useRef(false);
    const onCreate = useCallback((e: any) => {
        console.log('[onCreate] features:', e.features.length, 'splitTargetId:', splitTargetId, 'types:', e.features.map((f: any) => f.geometry?.type));
        for (const f of e.features) {
            // If we're in split mode and a line was drawn, perform the split
            if (splitTargetId && f.geometry?.type === 'LineString') {
                // Guard against double-invocation (React StrictMode)
                if (splitInProgressRef.current) {
                    console.log('[onCreate] BLOCKED duplicate split');
                    return;
                }
                splitInProgressRef.current = true;
                console.log('[onCreate] performing split');
                performSplit(f, splitTargetId);
                // Remove the temporary line from draw
                if (drawRef.current) {
                    drawRef.current.delete(f.id);
                }
                setSplitTargetId(null);
                setTimeout(() => { splitInProgressRef.current = false; }, 100);
                return;
            }
            // Only treat Polygon features as new areas; skip lines or other types
            if (f.geometry?.type !== 'Polygon') {
                console.log('[onCreate] skipping non-polygon:', f.geometry?.type, f.id);
                if (drawRef.current) drawRef.current.delete(f.id);
                continue;
            }
            console.log('[onCreate] opening new area modal for:', f.geometry?.type, f.id);
            setCurrentFeature(f)
            setNewAreaName('')
            setNewAreaType('workarea')
            setModalOpen(true)
        }
    }, [splitTargetId, performSplit]);

    const onUpdate = useCallback((e: any) => {
        setFeatures(currFeatures => {
            const newFeatures = {...currFeatures};
            for (const f of e.features) {



                const feature = newFeatures[f.id];
                if ((!(feature instanceof MowingAreaFeature)) &&
                (!(feature instanceof ObstacleFeature)) &&
                (!(feature instanceof NavigationFeature)) 
                )
                    continue;

                if ((f.geometry.type=='Polygon'))
                        feature.setGeometry(f.geometry);
            }
            return newFeatures;
        });
    }, []);

    const onCombine = useCallback((e: any) => {

            const firstDeleted = e.deletedFeatures[0] as Feature<Polygon>;
            const areaType = firstDeleted?.properties?.feature_type as string;
            const coordinates = union(featureCollection(e.deletedFeatures));

            if ((coordinates == null) || (coordinates.geometry.type!='Polygon')) {
                notification.error({
                    message: 'Unable to combine areas. Do they overlap?'
                })
                setFeatures({...features});//revert
                return;
            }

            const mergedFeature = {
                id:'',
                properties: firstDeleted.properties,
                geometry: coordinates.geometry,
                type: "Feature"
            } as Feature<Polygon>;

            // Perform delete + add in a single state update to avoid race conditions
            setFeatures(currFeatures => {
                // First, remove deleted features
                const newFeatures = {...currFeatures};
                for (const f of e.deletedFeatures) {
                    delete newFeatures[f.id];
                }

                // Then, add the merged feature
                let type: string;
                let constructFn: (id: string) => MowingFeatureBase | null;

                switch (areaType) {
                    case 'workarea':
                        type = "area";
                        constructFn = (id) => new MowingAreaFeature(id, mowingAreas.length + 1);
                        break;
                    case 'navigation':
                        type = "navigation";
                        constructFn = (id) => new NavigationFeature(id);
                        break;
                    case 'obstacle': {
                        type = "area";
                        const currentLayerCoordinates = mergedFeature.geometry.coordinates[0];
                        const area = Object.values<MowingFeature>(newFeatures).find((f) => {
                            if (!(f instanceof MowingAreaFeature)) return false;
                            const areaCoordinates = f.geometry.coordinates[0];
                            return inside(currentLayerCoordinates, areaCoordinates);
                        });
                        if (!area) {
                            notification.info({ message: "Unable to match an area for this obstacle" });
                            return features; // revert
                        }
                        constructFn = (id) => new ObstacleFeature(id, area as MowingAreaFeature);
                        break;
                    }
                    default:
                        notification.error({ message: `Unknown type ${areaType}` });
                        return features; // revert
                }

                const component = areaType === 'obstacle' ? 'obstacle' : 'area';
                const id = getNewId(newFeatures, type, null, component);
                const nfeat = constructFn(id);
                if (!nfeat) {
                    return features; // revert
                }
                nfeat.setGeometry(mergedFeature.geometry);
                newFeatures[id] = nfeat;

                sortFeatures(newFeatures);
                return newFeatures;
            });
    },[features, inside, mowingAreas.length, notification]);

    function sortFeatures(tosort: Record<string, MowingFeature>,  curMowingAreaFeature: MowingAreaEdit|undefined = undefined) {
        /* sort the mowing areas by mowing order. If there is a duplicate decide the order based on the area (curMowingAreaFeature) that the user 
        added. */
        

        const idxorder = Object.values(tosort).sort((a: MowingFeature,b: MowingFeature ) => {
            if ((a instanceof MowingAreaFeature) && (!(b instanceof MowingAreaFeature)))
                return -1;

            if ((b instanceof MowingAreaFeature) && (!(a instanceof MowingAreaFeature)))
                return 1;

            if (!(b instanceof MowingAreaFeature) || (!(a instanceof MowingAreaFeature)))
                return 0;

            if (a.getMowingOrder() == b.getMowingOrder()) {
                if (curMowingAreaFeature) {

                    return (((a.id == curMowingAreaFeature.id) && (curMowingAreaFeature.orig_mowing_order < curMowingAreaFeature.mowing_order)) 
                        || ((b.id == curMowingAreaFeature.id) && (curMowingAreaFeature.orig_mowing_order > curMowingAreaFeature.mowing_order)) ) ? 1 :-1;
                }
                else {
                    console.warn("Duplicate mowing order detected");
                    return -1;
                }
            }

            return a.getMowingOrder() > b.getMowingOrder()? 1 :-1;

        });

        console.log(idxorder);
        let i = 1;
        idxorder.map(e=> {
            if (e instanceof MowingAreaFeature){
                e.properties.mowing_order = i; 
                i++;
            }
        })
    }

    function updateMowingArea() {
        if ((!curMowingAreaFeature) || (!curMowingAreaFeature.id))
            return;

        setAreaModelOpen(false);
        const newFeatures = {...features} as Record<string, MowingFeature>;
        const oldFeature = newFeatures[curMowingAreaFeature.id];
        if (!oldFeature || !(oldFeature instanceof MowingFeatureBase))
            return;

        const typeChanged = curMowingAreaFeature.feature_type !== curMowingAreaFeature.orig_feature_type;

        if (typeChanged) {
            // Replace the feature with the correct class for the new type
            const geometry = oldFeature.geometry;
            let replacement: MowingFeatureBase;
            const newId = curMowingAreaFeature.id;

            switch (curMowingAreaFeature.feature_type) {
                case 'navigation':
                    replacement = new NavigationFeature(newId);
                    replacement.setGeometry(geometry);
                    break;
                case 'obstacle': {
                    // Find the first mowing area to use as parent
                    const parentArea = Object.values(newFeatures).find(
                        (f): f is MowingAreaFeature => f instanceof MowingAreaFeature
                    );
                    if (!parentArea) {
                        // No mowing area exists; cannot create orphan obstacle
                        return;
                    }
                    replacement = new ObstacleFeature(newId, parentArea);
                    replacement.setGeometry(geometry);
                    break;
                }
                default: // workarea
                    replacement = new MowingAreaFeature(newId, curMowingAreaFeature.mowing_order);
                    replacement.setGeometry(geometry);
                    (replacement as MowingAreaFeature).setName(curMowingAreaFeature.name);
                    break;
            }
            newFeatures[newId] = replacement;
        } else if (oldFeature instanceof MowingAreaFeature) {
            oldFeature.setName(curMowingAreaFeature.name);
            if (curMowingAreaFeature.mowing_order !== curMowingAreaFeature.orig_mowing_order) {
                oldFeature.setMowingOrder(curMowingAreaFeature.mowing_order);
                sortFeatures(newFeatures, curMowingAreaFeature);
            }
        }

        setFeatures(newFeatures);

        const labels = buildLabels(Object.values(newFeatures));
        setLabelsCollection({
            type: "FeatureCollection",
            features: labels,
        });
    }


    const onOpenDetails = useCallback((e: any) => {
        if ((!e) || (!e.feature) || (!e.feature.id))
            return;

        const feature = e.feature as Feature<Polygon>;
        if (!feature)
            return;

        const props = feature.properties;
        const ftype = props?.feature_type;
        if (ftype !== 'workarea' && ftype !== 'navigation' && ftype !== 'obstacle') {
            notification.info({
                message: "Unable to edit this feature"});
            return;
        }
        setCurMowingAreaFeature(
            { id            : feature.id
            , index         : props?.index ?? -1
            , name          : props?.name ?? ''
            , mowing_order  : props?.mowing_order ?? 9999
            , orig_mowing_order  : props?.mowing_order ?? 9999
            , feature_type  : ftype
            , orig_feature_type  : ftype} as MowingAreaEdit);

        setAreaModelOpen(true);
    }, [notification]);

    const onSelectionChange = useCallback((e: { features: GeoJSON.Feature[] }) => {
        setSelectedFeatureIds(
            e.features
                .filter((f) => f.id != null)
                .map((f) => String(f.id))
        );
    }, []);

    const handleEditSelectedFeature = useCallback(() => {
        if (selectedFeatureIds.length !== 1) return;
        const feat = features[selectedFeatureIds[0]];
        if (!feat) return;
        onOpenDetails({feature: feat});
    }, [selectedFeatureIds, features, onOpenDetails]);

    const handleDrawPolygon = useCallback(() => {
        drawRef.current?.changeMode('draw_polygon');
    }, []);

    const handleTrash = useCallback(() => {
        drawRef.current?.trash();
    }, []);

    const handleCombine = useCallback(() => {
        drawRef.current?.combineFeatures();
    }, []);

    const handleAreaSelect = useCallback((id: string) => {
        if (!editMap || !drawRef.current) return;
        drawRef.current.changeMode('simple_select', {featureIds: [id]});
        setSelectedFeatureIds([id]);
    }, [editMap]);

    const handleSubtract = useCallback(() => {
        if (selectedFeatureIds.length !== 2) {
            notification.info({message: 'Select exactly 2 areas to subtract'});
            return;
        }
        const [keepId, cutId] = selectedFeatureIds;
        const keepFeat = features[keepId];
        const cutFeat = features[cutId];
        if (!keepFeat || !cutFeat || !(keepFeat instanceof MowingFeatureBase) || !(cutFeat instanceof MowingFeatureBase)) {
            notification.error({message: 'Both selections must be polygon areas'});
            return;
        }

        const result = difference(featureCollection([keepFeat as any, cutFeat as any]));
        if (!result || result.geometry.type !== 'Polygon') {
            notification.error({message: 'Subtract failed — areas may not overlap, or result is not a simple polygon'});
            return;
        }

        setFeatures(curr => {
            const next = {...curr};
            const feat = next[keepId];
            if (feat && feat instanceof MowingFeatureBase) {
                feat.setGeometry(result.geometry as any);
            }
            return next;
        });
        // Update draw control
        if (drawRef.current) {
            const drawFeat = drawRef.current.get(keepId);
            if (drawFeat) {
                drawFeat.geometry = result.geometry;
                drawRef.current.add(drawFeat);
            }
            drawRef.current.changeMode('simple_select', {featureIds: [keepId]});
        }
        notification.success({message: 'Area subtracted'});
    }, [selectedFeatureIds, features, notification]);

    const handleSplit = useCallback(() => {
        if (selectedFeatureIds.length !== 1) {
            notification.info({message: 'Select exactly 1 area to split'});
            return;
        }
        const targetId = selectedFeatureIds[0];
        const feat = features[targetId];
        if (!feat || !(feat instanceof MowingFeatureBase)) {
            notification.error({message: 'Selection must be a polygon area'});
            return;
        }
        setSplitTargetId(targetId);
        notification.info({message: 'Draw a line across the area to split it'});
        drawRef.current?.changeMode('draw_line_string');
    }, [selectedFeatureIds, features, notification]);

    const onDelete = useCallback((e: any) => {
        setFeatures(currFeatures => {
            const newFeatures = {...currFeatures};
            for (const f of e.features) {
                delete newFeatures[f.id];
            }
            return newFeatures;
        });
    }, []);

    function cancelAreaModal() {
        setAreaModelOpen(false);
    }

    async function handleSaveMap() {
        const areas: Record<string, MowerMapMapArea[]> = {
            "area": [],
            "navigation": [],
        }

        // Separate features by role: workareas/nav first, obstacles second
        const areaFeatures: MowingFeatureBase[] = [];
        const obstacleFeatures: ObstacleFeature[] = [];

        for (const f of Object.values(features)) {
            if (f instanceof ObstacleFeature) {
                obstacleFeatures.push(f);
            } else if (f instanceof MowingAreaFeature || f instanceof NavigationFeature) {
                areaFeatures.push(f);
            }
        }

        // Sort workareas by mowing_order, navigation areas come after
        areaFeatures.sort((a, b) => {
            // workareas before navigation
            if (a instanceof MowingAreaFeature && !(b instanceof MowingAreaFeature)) return -1;
            if (!(a instanceof MowingAreaFeature) && b instanceof MowingAreaFeature) return 1;
            return (a.properties.mowing_order ?? 9999) - (b.properties.mowing_order ?? 9999);
        });

        // Track per-type index counters and map feature ID → index in areas array
        const typeCounters: Record<string, number> = { "area": 0, "navigation": 0 };
        const featureIndexMap: Record<string, { type: string; index: number }> = {};

        for (const f of areaFeatures) {
            const idDetails = f.id.split("-");
            if (idDetails.length !== 4) {
                console.error("Invalid id " + f.id);
                continue;
            }
            const type = idDetails[0];
            if (!areas[type]) {
                console.error("Unknown area type " + type);
                continue;
            }

            const index = typeCounters[type]++;
            featureIndexMap[f.id] = { type, index };

            const rawPoints = f.geometry.coordinates[0].map((point) => {
                const p = itranspose(offsetX, offsetY, datum, point[1], point[0]);
                return { x: p[0], y: p[1], z: 0 };
            });
            const points = dedupePoints(rawPoints);

            areas[type][index] = {
                name: f.properties?.name ?? '',
                area: { points },
            };
        }

        // Now process obstacles and attach them to their parent area
        for (const f of obstacleFeatures) {
            const parentArea = f.getMowingArea();
            const parentMapping = featureIndexMap[parentArea.id];
            if (!parentMapping) {
                console.error("Obstacle " + f.id + " references unknown parent area " + parentArea.id);
                continue;
            }

            const rawPoints = f.geometry.coordinates[0].map((point) => {
                const p = itranspose(offsetX, offsetY, datum, point[1], point[0]);
                return { x: p[0], y: p[1], z: 0 };
            });
            const points = dedupePoints(rawPoints);

            const target = areas[parentMapping.type][parentMapping.index];
            target.obstacles = [...(target.obstacles ?? []), { points }];
        }

        const updateMsg: MowerReplaceMapSrvReq = {
            areas: []
        };
        for (const [type, areasOfType] of Object.entries(areas)) {
            for (const area of areasOfType) {
                updateMsg.areas.push({
                    area: area,
                    isNavigationArea: type === "navigation",
                });
            }
        }
        try {
            await guiApi.openmower.mapReplace(updateMsg)
            notification.success({
                message: "Area saved",
            })
            setHasUnsavedChanges(false)
            setEditMap(false)
        } catch (e: any) {
            notification.error({
                message: "Failed to save area",
                description: e.message,
            })
        }

        if (!map) {
            await guiApi.openmower.mapDockingCreate({
                dockingPose: {
                    orientation: {
                        x: 0,
                        y: 0,
                        z: 0,
                        w: 1,
                    },
                    position: {
                        x: 0,
                        y: 0,
                        z: 0,
                    }
                }
            })
        } else {
            let quaternionFromHeading = getQuaternionFromHeading(map?.DockHeading!!);
            await guiApi.openmower.mapDockingCreate({
                dockingPose: {
                    orientation: {
                        x: quaternionFromHeading.X!!,
                        y: quaternionFromHeading.Y!!,
                        z: quaternionFromHeading.Z!!,
                        w: quaternionFromHeading.W!!,
                    },
                    position: {
                        x: map?.DockX!!,
                        y: map?.DockY!!,
                        z: 0,
                    }
                }
            })
        }

    }

    const handleBackupMap = () => {
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        const json = JSON.stringify(map),
            blob = new Blob([json], {type: "octet/stream"}),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = "map.json";
        a.click();
        window.URL.revokeObjectURL(url);
    };
    
    const handleRestoreMap = () => {
        /*<input id="file-input" type="file" name="name" style="display: none;" />*/
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        document.body.appendChild(input);
        input.addEventListener('change', (event) => {
            setEditMap(true)
            const file = (event as unknown as ChangeEvent<HTMLInputElement>).target?.files?.[0];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.addEventListener('load', (event) => {
                let content = event.target?.result as string;
                let parts = content.split(",");
                let newMap = JSON.parse(atob(parts[1])) as MapType;
                setMap(newMap)
            });
            reader.readAsDataURL(file);
        })
        input.click();
    };

    const handleDownloadGeoJSON = () => {
        const geojson = {
            type: "FeatureCollection",
            features: Object.values(features)
        };
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        const json = JSON.stringify(geojson),
            blob = new Blob([json], { type: "application/geo+json" }),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = "map.geojson";
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleUploadGeoJSON = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        document.body.appendChild(input);
        input.addEventListener('change', (event) => {
            const file = (event as unknown as ChangeEvent<HTMLInputElement>).target?.files?.[0];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                const geojson = JSON.parse(event.target?.result as string) as FeatureCollection;
                const geojsonfeatures = geojson.features.reduce((acc, feature) => {
                    acc[feature.id as string] = feature;
                    return acc;
                }, {} as Record<string, Feature>);

                const newFeatures = {} as Record<string, MowingFeature>;
                Object.values(geojsonfeatures).forEach(element => {
                    const areaType = element?.properties?.feature_type as string;
    
                    let nfeat = null;
                    if (!element.id)
                        return;

                    if (typeof element.id == 'number')
                        element.id = element.id.toString();

                    if (element.geometry.type == 'Polygon') {
            

                        

                        switch (areaType) {
                            case 'workarea':
                                nfeat =  element as MowingAreaFeature;
                                //nfeat = new MowingAreaFeature(element.id, element?.properties?.mowing_order??100);
                                //nfeat.geometry.coordinates = origFeature.geometry.coordinates;
                                //nfeat.setName(origFeature?.properties?.name)
                                break;
                            case 'navigation':
                                nfeat =  element as NavigationFeature;
                                //nfeat = new NavigationFeature(element.id);
                                //nfeat.geometry.coordinates = origFeature.geometry.coordinates;
                                break;
                            case 'obstacle':
                                nfeat =  element as ObstacleFeature;
                                //nfeat = new ObstacleFeature(element.id, newFeatures[element.mowing_area.id]);
                                //nfeat.geometry.coordinates = origFeature.geometry.coordinates;
                                break;
                            default:
                                notification.error({
                                    message: `Unknown type ${areaType}`
                                })
                                setFeatures({...features});//revert
                                return;
                        }
                    }
                    else {
                        switch (areaType) {
                            case 'dock':
                                nfeat =  element as DockFeatureBase;
                            //nfeat = new DockFeatureBase(origFeature.geometry.coordinates);
                                break;
                                default:
                            notification.error({
                                message: `Unknown type ${areaType}`
                            })
                            setFeatures({...features});//revert
                            return;
                        }

                    }
                    newFeatures[element.id] = nfeat;
                });

                setFeatures(newFeatures);
            };
            reader.readAsText(file);
        });
        input.click();
    };

    const {manualMode, handleManualMode, handleStopManualMode, handleJoyMove, handleJoyStop} = useManualMode({mowerAction, joyStream});

    if (_datumLon == 0 || _datumLat == 0) {
        return <Spinner/>
    }
    if (compact) {
        return (
            <div style={{width: '100%', height: '100%', position: 'relative'}}>
                {map_sw?.length && map_ne?.length ? <Map key={mapKey}
                                                         reuseMaps
                                                         antialias
                                                         projection={{
                                                             name: "globe"
                                                         }}
                                                         mapboxAccessToken="pk.eyJ1IjoiY2VkYm9zc25lbyIsImEiOiJjbGxldjB4aDEwOW5vM3BxamkxeWRwb2VoIn0.WOccbQZZyO1qfAgNxnHAnA"
                                                         initialViewState={{
                                                             bounds: [{lng: map_sw[0], lat: map_sw[1]}, {lng: map_ne[0], lat: map_ne[1]}],
                                                         }}
                                                         style={{width: '100%', height: '100%'}}
                                                         mapStyle={useSatellite ? "mapbox://styles/mapbox/satellite-streets-v12" : "mapbox://styles/mapbox/dark-v11"}
                                                         interactive={false}
                                                         attributionControl={false}
                >
                    {tileUri ? <Source type={"raster"} id={"custom-raster"} tiles={[tileUri]} tileSize={256}/> : null}
                    {tileUri ? <Layer type={"raster"} source={"custom-raster"} id={"custom-layer"}/> : null}
                    <Source type={"geojson"} id={"labels"} data={labelsCollection}/>
                    <Layer type={"symbol"} id={"mower"} source={"labels"} layout={{
                        "text-field": ['get', 'title'],
                        "text-rotation-alignment": "auto",
                        "text-allow-overlap": true,
                        "text-anchor": "top"
                    }} paint={{
                        "text-color": "#ffffff",
                        "text-halo-color": "rgba(0, 0, 0, 0.8)",
                        "text-halo-width": 1.5,
                    }}/>
                    <DrawControl
                        drawRef={drawRef}
                        styles={MapStyle}
                        userProperties={true}
                        features={drawableFeatures}
                        position="top-left"
                        displayControlsDefault={false}
                        editMode={false}
                        controls={{}}
                        defaultMode="simple_select"
                        onCreate={() => {}}
                        onUpdate={() => {}}
                        onCombine={() => {}}
                        onDelete={() => {}}
                        onSelectionChange={() => {}}
                        onOpenDetails={() => {}}
                    />
                    <Source type={"geojson"} id={"display-features"} data={displayFeatures}>
                        <Layer type={"line"} id={"display-lines"} filter={['==', '$type', 'LineString']}
                            layout={{'line-cap': 'round', 'line-join': 'round'}}
                            paint={{
                                'line-color': ['get', 'color'],
                                'line-width': ['get', 'width'],
                            }}/>
                        <Layer type={"circle"} id={"display-points-halo"} filter={['==', '$type', 'Point']}
                            paint={{
                                'circle-radius': 8,
                                'circle-color': '#ffffff',
                                'circle-opacity': 0.9,
                            }}/>
                        <Layer type={"circle"} id={"display-points"} filter={['==', '$type', 'Point']}
                            paint={{
                                'circle-radius': 5,
                                'circle-color': ['get', 'color'],
                            }}/>
                    </Source>
                </Map> : <Spinner/>}
            </div>
        );
    }

    return (
        <div style={{height: isMobile ? 'calc(100% + 8px)' : 'calc(100% + 10px)', margin: isMobile ? '-8px -8px 0' : '-10px -24px 0', width: isMobile ? 'calc(100% + 16px)' : 'calc(100% + 48px)'}}>
            <NewAreaModal
                open={modalOpen}
                areaType={newAreaType}
                areaName={newAreaName}
                onAreaTypeChange={setNewAreaType}
                onAreaNameChange={setNewAreaName}
                onSave={handleSaveNewArea}
                onCancel={deleteFeature}
            />
            <EditAreaModal
                open={areaModelOpen}
                area={curMowingAreaFeature}
                onChange={setCurMowingAreaFeature}
                onSave={updateMowingArea}
                onCancel={cancelAreaModal}
            />

            <div style={{height: '100%', position: 'relative'}}>
                {map_sw?.length && map_ne?.length ? <Map key={mapKey}
                                                         reuseMaps
                                                         antialias
                                                         projection={{
                                                             name: "globe"
                                                         }}
                                                         mapboxAccessToken="pk.eyJ1IjoiY2VkYm9zc25lbyIsImEiOiJjbGxldjB4aDEwOW5vM3BxamkxeWRwb2VoIn0.WOccbQZZyO1qfAgNxnHAnA"
                                                         initialViewState={{
                                                             bounds: [{lng: map_sw[0], lat: map_sw[1]}, {lng: map_ne[0], lat: map_ne[1]}],
                                                         }}
                                                         style={{width: '100%', height: '100%'}}
                                                         mapStyle={useSatellite ? "mapbox://styles/mapbox/satellite-streets-v12" : "mapbox://styles/mapbox/dark-v11"}
                                                         onLoad={(e) => { mapInstanceRef.current = e.target as unknown as MapboxMap }}
                >
                    {tileUri ? <Source type={"raster"} id={"custom-raster"} tiles={[tileUri]} tileSize={256}/> : null}
                    {tileUri ? <Layer type={"raster"} source={"custom-raster"} id={"custom-layer"}/> : null}
                    <Source type={"geojson"} id={"labels"} data={labelsCollection}/>
                    <Layer type={"symbol"} id={"mower"} source={"labels"} layout={{
                        "text-field": ['get', 'title'],
                        "text-rotation-alignment": "auto",
                        "text-allow-overlap": true,
                        "text-anchor": "top"
                    }} paint={{
                        "text-color": "#ffffff",
                        "text-halo-color": "rgba(0, 0, 0, 0.8)",
                        "text-halo-width": 1.5,
                    }}/>
                    <DrawControl
                        drawRef={drawRef}
                        styles={MapStyle}
                        userProperties={true}
                        features={drawableFeatures}
                        position="top-left"
                        displayControlsDefault={false}
                        editMode={editMap}
                        controls={{}}
                        defaultMode="simple_select"
                        onCreate={onCreate}
                        onUpdate={onUpdate}
                        onCombine={onCombine}
                        onDelete={onDelete}
                        onSelectionChange={onSelectionChange}
                        onOpenDetails={onOpenDetails}
                    />
                    {/* Display-only features: mower, dock, heading, paths */}
                    <Source type={"geojson"} id={"display-features"} data={displayFeatures}>
                        <Layer type={"line"} id={"display-lines"} filter={['==', '$type', 'LineString']}
                            layout={{'line-cap': 'round', 'line-join': 'round'}}
                            paint={{
                                'line-color': ['get', 'color'],
                                'line-width': ['get', 'width'],
                            }}/>
                        <Layer type={"circle"} id={"display-points-halo"} filter={['==', '$type', 'Point']}
                            paint={{
                                'circle-radius': 8,
                                'circle-color': '#ffffff',
                                'circle-opacity': 0.9,
                            }}/>
                        <Layer type={"circle"} id={"display-points"} filter={['==', '$type', 'Point']}
                            paint={{
                                'circle-radius': 5,
                                'circle-color': ['get', 'color'],
                            }}/>
                    </Source>
                    <Source type={"geojson"} id={"lidar"} data={lidarCollection}>
                        <Layer type={"circle"} id={"lidar-points"} paint={{
                            "circle-radius": 3,
                            "circle-color": [
                                "case",
                                ["==", ["get", "intensity"], "hit"],
                                "rgba(255, 50, 50, 0.8)",
                                "rgba(255, 220, 80, 0.4)"
                            ],
                            "circle-stroke-width": 0,
                        }}/>
                    </Source>
                </Map> : <Spinner/>}
                <JoystickOverlay
                    visible={highLevelStatus.highLevelStatus.StateName === "AREA_RECORDING" || manualMode != null}
                    onMove={handleJoyMove}
                    onStop={handleJoyStop}
                />
                {isMobile && (
                    <MapToolbarMobile
                        editMap={editMap}
                        hasUnsavedChanges={hasUnsavedChanges}
                        manualMode={manualMode}
                        useSatellite={useSatellite}
                        historyIndex={historyIndex}
                        editHistoryLength={editHistory.length}
                        mowingAreas={mowingAreas}
                        selectedFeatureCount={selectedFeatureIds.length}
                        onEditMap={handleEditMap}
                        onEditSelectedFeature={handleEditSelectedFeature}
                        onDrawPolygon={handleDrawPolygon}
                        onTrash={handleTrash}
                        onCombine={handleCombine}
                        onSubtract={handleSubtract}
                        onSplit={handleSplit}
                        onSaveMap={handleSaveMap}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        onToggleSatellite={() => setUseSatellite(!useSatellite)}
                        onManualMode={handleManualMode}
                        onStopManualMode={handleStopManualMode}
                        onBackupMap={handleBackupMap}
                        onRestoreMap={handleRestoreMap}
                        onDownloadGeoJSON={handleDownloadGeoJSON}
                        onUploadGeoJSON={handleUploadGeoJSON}
                        onMowArea={(key) => {
                            const item = mowingAreas.find(item => item.key == key)
                            return mowerAction("start_in_area", {
                                area: item?.feat?.properties?.index,
                            })()
                        }}
                        stateName={highLevelStatus.highLevelStatus.StateName}
                        emergency={highLevelStatus.highLevelStatus.Emergency}
                        onStart={mowerAction("high_level_control", {Command: 1})}
                        onHome={mowerAction("high_level_control", {Command: 2})}
                        onEmergencyOn={mowerAction("emergency", {Emergency: 1})}
                        onEmergencyOff={mowerAction("emergency", {Emergency: 0})}
                    />
                )}
                {/* Desktop: Edit mode — left vertical toolbar */}
                {!isMobile && editMap && (
                    <MapEditorToolbar
                        hasUnsavedChanges={hasUnsavedChanges}
                        historyIndex={historyIndex}
                        editHistoryLength={editHistory.length}
                        selectedFeatureCount={selectedFeatureIds.length}
                        onSaveMap={handleSaveMap}
                        onCancel={handleEditMap}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        onDrawPolygon={handleDrawPolygon}
                        onTrash={handleTrash}
                        onCombine={handleCombine}
                        onSubtract={handleSubtract}
                        onSplit={handleSplit}
                        onEditSelectedFeature={handleEditSelectedFeature}
                    />
                )}
                {/* Desktop: View mode — bottom glass toolbar */}
                {!isMobile && !editMap && (
                    <div style={{position: 'absolute', bottom: 12, left: 16, right: 16, zIndex: 10, background: 'rgba(20, 20, 20, 0.75)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', padding: '10px 14px'}}>
                        <MapToolbar
                            bare
                            editMap={editMap}
                            hasUnsavedChanges={hasUnsavedChanges}
                            manualMode={manualMode}
                            useSatellite={useSatellite}
                            historyIndex={historyIndex}
                            editHistoryLength={editHistory.length}
                            mowingAreas={mowingAreas}
                            selectedFeatureCount={selectedFeatureIds.length}
                            onEditMap={handleEditMap}
                            onEditSelectedFeature={handleEditSelectedFeature}
                            onDrawPolygon={handleDrawPolygon}
                            onTrash={handleTrash}
                            onCombine={handleCombine}
                            onSaveMap={handleSaveMap}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                            onToggleSatellite={() => setUseSatellite(!useSatellite)}
                            onManualMode={handleManualMode}
                            onStopManualMode={handleStopManualMode}
                            onBackupMap={handleBackupMap}
                            onRestoreMap={handleRestoreMap}
                            onDownloadGeoJSON={handleDownloadGeoJSON}
                            onUploadGeoJSON={handleUploadGeoJSON}
                            onMowArea={(key) => {
                                const item = mowingAreas.find(item => item.key == key)
                                return mowerAction("start_in_area", {
                                    area: item?.feat?.properties?.index,
                                })()
                            }}
                        />
                    </div>
                )}
                {/* Desktop: Right panel — areas list + offset */}
                {!isMobile && (
                    <div style={{position: 'absolute', top: 12, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 0, width: 240, maxHeight: 'calc(100% - 32px)', background: 'rgba(20, 20, 20, 0.75)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', overflow: 'hidden'}}>
                        <AreasListPanel
                            areas={areasList}
                            onAreaClick={editMap ? handleAreaSelect : undefined}
                            selectedId={editMap ? selectedFeatureIds[0] : undefined}
                        />
                        <div style={{borderTop: '1px solid rgba(255,255,255,0.06)', padding: 8}}>
                            <MapOffsetPanel
                                offsetX={offsetX}
                                offsetY={offsetY}
                                onChangeX={handleOffsetX}
                                onChangeY={handleOffsetY}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

//MapPage.whyDidYouRender = true

export default MapPage;
