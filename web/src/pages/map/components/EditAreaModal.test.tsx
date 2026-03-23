import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {EditAreaModal} from './EditAreaModal.tsx';
import {MowingAreaEdit} from '../utils/types.ts';

describe('EditAreaModal', () => {
    const area = new MowingAreaEdit();
    area.name = 'Garden';
    area.mowing_order = 2;

    const defaultProps = {
        open: true,
        area,
        onChange: vi.fn(),
        onSave: vi.fn(),
        onCancel: vi.fn(),
    };

    it('renders with area name in title', () => {
        render(<EditAreaModal {...defaultProps} />);
        expect(screen.getByText('Edit "Garden"')).toBeInTheDocument();
    });

    it('shows generic title when no name', () => {
        const noNameArea = new MowingAreaEdit();
        render(<EditAreaModal {...defaultProps} area={noNameArea} />);
        expect(screen.getByText('Edit area')).toBeInTheDocument();
    });

    it('renders with area name in input', () => {
        render(<EditAreaModal {...defaultProps} />);
        expect(screen.getByDisplayValue('Garden')).toBeInTheDocument();
    });

    it('renders with mowing order', () => {
        render(<EditAreaModal {...defaultProps} />);
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(<EditAreaModal {...defaultProps} open={false} />);
        expect(screen.queryByText('Edit "Garden"')).not.toBeInTheDocument();
    });

    it('calls onSave when Save clicked', async () => {
        const onSave = vi.fn();
        const user = userEvent.setup();
        render(<EditAreaModal {...defaultProps} onSave={onSave} />);
        await user.click(screen.getByText('Save'));
        expect(onSave).toHaveBeenCalled();
    });

    it('calls onCancel when Cancel clicked', async () => {
        const onCancel = vi.fn();
        const user = userEvent.setup();
        render(<EditAreaModal {...defaultProps} onCancel={onCancel} />);
        await user.click(screen.getByText('Cancel'));
        expect(onCancel).toHaveBeenCalled();
    });

    it('calls onChange when name is edited', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        render(<EditAreaModal {...defaultProps} onChange={onChange} />);
        const input = screen.getByDisplayValue('Garden');
        await user.clear(input);
        await user.type(input, 'Back Yard');
        expect(onChange).toHaveBeenCalled();
    });
});
