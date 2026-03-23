import {Form, Input, InputNumber, Modal} from "antd";
import {MowingAreaEdit} from "../utils/types.ts";

interface EditAreaModalProps {
    open: boolean;
    area: MowingAreaEdit;
    onChange: (area: MowingAreaEdit) => void;
    onSave: () => void;
    onCancel: () => void;
}

export const EditAreaModal = ({open, area, onChange, onSave, onCancel}: EditAreaModalProps) => (
    <Modal
        open={open}
        title={area.name ? `Edit "${area.name}"` : "Edit area"}
        okText="Save"
        cancelText="Cancel"
        onOk={onSave}
        onCancel={onCancel}
        destroyOnClose
    >
        <Form layout="vertical" style={{marginTop: 16}}>
            <Form.Item label="Area name">
                <Input
                    key="areaname"
                    placeholder="e.g. Front lawn"
                    value={area.name}
                    onChange={(e) => onChange({...area, name: e.target.value})}
                    autoFocus
                />
            </Form.Item>
            <Form.Item label="Mowing order">
                <InputNumber
                    key="mowingorder"
                    min={1}
                    value={area.mowing_order}
                    onChange={(v) => onChange({...area, mowing_order: v ?? 9999})}
                    style={{width: '100%'}}
                />
            </Form.Item>
        </Form>
    </Modal>
);
