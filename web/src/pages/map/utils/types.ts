export class MowingAreaEdit {
    id?: string;
    name: string;
    mowing_order: number;
    orig_mowing_order: number;
    index: number;

    constructor() {
        this.name = '';
        this.mowing_order = 9999;
        this.orig_mowing_order = 9999;
        this.index = -1;
    }
}

export interface AreaListItem {
    id: string;
    name: string;
    ftype: string;
    areaLabel: string;
    mowingOrder?: number;
}
