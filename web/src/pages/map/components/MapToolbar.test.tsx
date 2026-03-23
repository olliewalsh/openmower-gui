import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MapToolbar} from './MapToolbar.tsx';

// Mock the child components that use hooks
vi.mock('../../../components/MowerActions.tsx', () => ({
    MowerActions: ({children}: {children: React.ReactNode}) => <div data-testid="mower-actions">{children}</div>,
    useMowerAction: () => vi.fn(() => vi.fn()),
}));
vi.mock('../../../hooks/useHighLevelStatus.ts', () => ({
    useHighLevelStatus: () => ({highLevelStatus: {StateName: 'IDLE', Emergency: false}}),
}));
vi.mock('../../../hooks/useApi.ts', () => ({
    useApi: () => ({openmower: {callCreate: vi.fn()}}),
}));
vi.mock('../../../components/AsyncButton.tsx', () => ({
    default: ({children, onAsyncClick, ...props}: any) => (
        <button onClick={onAsyncClick} {...props}>{children}</button>
    ),
}));
vi.mock('../../../components/AsyncDropDownButton.tsx', () => ({
    default: ({children, ...props}: any) => (
        <button {...props}>{children}</button>
    ),
}));

describe('MapToolbar', () => {
    const defaultProps = {
        editMap: false,
        hasUnsavedChanges: false,
        manualMode: undefined as number | undefined,
        useSatellite: true,
        historyIndex: 0,
        editHistoryLength: 1,
        mowingAreas: [],
        onEditMap: vi.fn(),
        onSaveMap: vi.fn().mockResolvedValue(undefined),
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onToggleSatellite: vi.fn(),
        onManualMode: vi.fn().mockResolvedValue(undefined),
        onStopManualMode: vi.fn().mockResolvedValue(undefined),
        onBackupMap: vi.fn(),
        onRestoreMap: vi.fn(),
        onDownloadGeoJSON: vi.fn(),
        onUploadGeoJSON: vi.fn(),
        onMowArea: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders Edit Map button when not editing', () => {
        render(<MapToolbar {...defaultProps} />);
        expect(screen.getByText('Edit Map')).toBeInTheDocument();
    });

    it('renders Save Map button when editing', () => {
        render(<MapToolbar {...defaultProps} editMap={true} />);
        expect(screen.getByText('Save Map')).toBeInTheDocument();
    });

    it('shows "Save Map *" with danger style when there are unsaved changes', () => {
        render(<MapToolbar {...defaultProps} editMap={true} hasUnsavedChanges={true} />);
        expect(screen.getByText('Save Map *')).toBeInTheDocument();
    });

    it('shows Cancel button in edit mode', () => {
        render(<MapToolbar {...defaultProps} editMap={true} />);
        expect(screen.getByText('Cancel Map Edition')).toBeInTheDocument();
    });

    it('shows satellite toggle with correct label', () => {
        render(<MapToolbar {...defaultProps} useSatellite={true} />);
        expect(screen.getByText('Dark')).toBeInTheDocument();
    });

    it('shows "Satellite" when not using satellite', () => {
        render(<MapToolbar {...defaultProps} useSatellite={false} />);
        expect(screen.getByText('Satellite')).toBeInTheDocument();
    });

    it('shows Manual mowing button when not in manual mode', () => {
        render(<MapToolbar {...defaultProps} />);
        expect(screen.getByText('Manual mowing')).toBeInTheDocument();
    });

    it('shows Stop Manual Mowing when in manual mode', () => {
        render(<MapToolbar {...defaultProps} manualMode={123} />);
        expect(screen.getByText('Stop Manual Mowing')).toBeInTheDocument();
    });

    it('always shows Backup Map and Restore Map', () => {
        render(<MapToolbar {...defaultProps} />);
        expect(screen.getByText('Backup Map')).toBeInTheDocument();
        expect(screen.getByText('Restore Map')).toBeInTheDocument();
    });

    it('shows Download GeoJSON in view mode', () => {
        render(<MapToolbar {...defaultProps} />);
        expect(screen.getByText('Download GeoJSON')).toBeInTheDocument();
    });

    it('shows Upload GeoJSON only in edit mode', () => {
        const {rerender} = render(<MapToolbar {...defaultProps} />);
        expect(screen.queryByText('Upload GeoJSON')).not.toBeInTheDocument();

        rerender(<MapToolbar {...defaultProps} editMap={true} />);
        expect(screen.getByText('Upload GeoJSON')).toBeInTheDocument();
    });

    it('shows Mow area dropdown only in view mode', () => {
        const {rerender} = render(<MapToolbar {...defaultProps} />);
        expect(screen.getByText('Mow area')).toBeInTheDocument();

        rerender(<MapToolbar {...defaultProps} editMap={true} />);
        expect(screen.queryByText('Mow area')).not.toBeInTheDocument();
    });

    it('calls onEditMap when Edit Map clicked', async () => {
        const user = userEvent.setup();
        render(<MapToolbar {...defaultProps} />);
        await user.click(screen.getByText('Edit Map'));
        expect(defaultProps.onEditMap).toHaveBeenCalled();
    });

    it('calls onToggleSatellite when satellite button clicked', async () => {
        const user = userEvent.setup();
        render(<MapToolbar {...defaultProps} />);
        await user.click(screen.getByText('Dark'));
        expect(defaultProps.onToggleSatellite).toHaveBeenCalled();
    });

    it('calls onBackupMap when Backup Map clicked', async () => {
        const user = userEvent.setup();
        render(<MapToolbar {...defaultProps} />);
        await user.click(screen.getByText('Backup Map'));
        expect(defaultProps.onBackupMap).toHaveBeenCalled();
    });

    it('disables undo when at start of history', () => {
        render(<MapToolbar {...defaultProps} editMap={true} historyIndex={0} editHistoryLength={3} />);
        const undoBtn = screen.getByRole('button', {name: /undo/i});
        expect(undoBtn).toBeDisabled();
    });

    it('disables redo when at end of history', () => {
        render(<MapToolbar {...defaultProps} editMap={true} historyIndex={2} editHistoryLength={3} />);
        const redoBtn = screen.getByRole('button', {name: /redo/i});
        expect(redoBtn).toBeDisabled();
    });
});
