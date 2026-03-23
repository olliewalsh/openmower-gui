import {Button, Tooltip} from "antd";
import {UndoOutlined, RedoOutlined, GlobalOutlined} from "@ant-design/icons";
import {MowerActions} from "../../../components/MowerActions.tsx";
import AsyncButton from "../../../components/AsyncButton.tsx";
import AsyncDropDownButton from "../../../components/AsyncDropDownButton.tsx";
import type {Feature} from "geojson";

interface MowingAreaItem {
    key: string;
    label: string;
    feat: Feature;
}

interface MapToolbarProps {
    editMap: boolean;
    hasUnsavedChanges: boolean;
    manualMode: number | undefined;
    useSatellite: boolean;
    historyIndex: number;
    editHistoryLength: number;
    mowingAreas: MowingAreaItem[];
    onEditMap: () => void;
    onSaveMap: () => Promise<void>;
    onUndo: () => void;
    onRedo: () => void;
    onToggleSatellite: () => void;
    onManualMode: () => Promise<void>;
    onStopManualMode: () => Promise<void>;
    onBackupMap: () => void;
    onRestoreMap: () => void;
    onDownloadGeoJSON: () => void;
    onUploadGeoJSON: () => void;
    onMowArea: (key: string) => Promise<void>;
}

export const MapToolbar = ({
    editMap, hasUnsavedChanges, manualMode, useSatellite,
    historyIndex, editHistoryLength, mowingAreas,
    onEditMap, onSaveMap, onUndo, onRedo, onToggleSatellite,
    onManualMode, onStopManualMode,
    onBackupMap, onRestoreMap, onDownloadGeoJSON, onUploadGeoJSON,
    onMowArea,
}: MapToolbarProps) => (
    <MowerActions>
        {!editMap && <Button size="small" key="btnEdit" type="primary" onClick={onEditMap}>Edit Map</Button>}
        {editMap && <AsyncButton
            size="small"
            key="btnSave"
            type="primary"
            danger={hasUnsavedChanges}
            onAsyncClick={onSaveMap}
            style={hasUnsavedChanges ? {boxShadow: '0 0 0 3px rgba(255, 77, 79, 0.35)'} : undefined}
        >{hasUnsavedChanges ? 'Save Map *' : 'Save Map'}</AsyncButton>}
        {editMap && <Button size="small" key="btnCancel" onClick={onEditMap}>Cancel Map Edition</Button>}
        {editMap && <Tooltip title="Undo"><Button size="small" key="btnUndo" icon={<UndoOutlined/>} onClick={onUndo} disabled={historyIndex <= 0}/></Tooltip>}
        {editMap && <Tooltip title="Redo"><Button size="small" key="btnRedo" icon={<RedoOutlined/>} onClick={onRedo} disabled={historyIndex >= editHistoryLength - 1}/></Tooltip>}
        <Tooltip title={useSatellite ? "Switch to dark map" : "Switch to satellite"}>
            <Button size="small" key="btnSatellite" icon={<GlobalOutlined/>} onClick={onToggleSatellite}>
                {useSatellite ? "Dark" : "Satellite"}
            </Button>
        </Tooltip>
        {!editMap && <AsyncDropDownButton size="small" key="slctAreas" menu={{
            items: mowingAreas,
            onAsyncClick: (e: any) => onMowArea(e.key),
        }}>Mow area</AsyncDropDownButton>}
        {!manualMode && <AsyncButton size="small" key="btnManualMode" onAsyncClick={onManualMode}>Manual mowing</AsyncButton>}
        {manualMode && <AsyncButton size="small" key="btnAutoMode" onAsyncClick={onStopManualMode}>Stop Manual Mowing</AsyncButton>}
        <Button size="small" key="btnBackup" onClick={onBackupMap}>Backup Map</Button>
        <Button size="small" key="btnRestore" onClick={onRestoreMap}>Restore Map</Button>
        <Button size="small" key="btnDownloadGeo" onClick={onDownloadGeoJSON}>Download GeoJSON</Button>
        {editMap && <Button size="small" key="btnUploadGeo" onClick={onUploadGeoJSON}>Upload GeoJSON</Button>}
    </MowerActions>
);
