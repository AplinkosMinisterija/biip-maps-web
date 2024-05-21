export type PakmapsSublayerOpts = {
  name: string;
  value: string;
};

export class PakmapsSublayer {
  name: string;
  value: string;

  constructor(opts: PakmapsSublayerOpts) {
    this.name = opts.name;
    this.value = opts.value;
  }
}
