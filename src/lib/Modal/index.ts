import { ModalStyles, StyleObject } from '../../interfaces/Modal';
import { getDefaultModalStyles, modalKeyframeAnimations } from './styles';

export const MODAL_ID = 'paper-js-sdk-modal';
export class Modal {
  protected container: HTMLElement;
  protected main: HTMLDivElement;
  protected overlay: HTMLDivElement;
  protected iframe: HTMLIFrameElement;

  protected style: HTMLStyleElement;
  styles = getDefaultModalStyles();
  body: HTMLDivElement;

  constructor(container?: HTMLElement, styles?: Partial<ModalStyles>) {
    this.container = container || document.body;

    if (styles) {
      this.mergeStyles(styles);
    }

    this.main = document.createElement('div');
    this.main.id = MODAL_ID;

    this.overlay = document.createElement('div');
    this.body = document.createElement('div');
    this.iframe = document.createElement('iframe');

    this.style = document.createElement('style');
    this.style.innerHTML = modalKeyframeAnimations;

    this.assignStyles(this.main, this.styles.main);
    this.assignStyles(this.overlay, this.styles.overlay);
    this.assignStyles(this.body, this.styles.body);
    this.assignStyles(this.iframe, this.styles.iframe);
  }

  open({ iframeUrl }: { iframeUrl?: string } = {}) {
    if (iframeUrl) {
      this.iframe.src = iframeUrl;
      this.body.appendChild(this.iframe);
    }

    this.addAccessibility();
    this.addListeners();

    this.main.appendChild(this.overlay);
    this.main.appendChild(this.style);
    this.main.appendChild(this.body);

    this.container.appendChild(this.main);
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.body.style.animation = 'pew-modal-slideOut 0.2s forwards';

    this.body.addEventListener('animationend', () => {
      document.body.style.overflow = 'visible';
      this.main.remove();
    });

    // window.removeEventListener("keydown", this.onKeyDown);
  }

  protected addListeners() {
    /**
     * TODO : Figure out a way to add handlers while not affecting code flow
     * example: Dev call otpLogin which opens anm iframe asking for code.
     * User clicks esc.
     * What happens to the dev flow now? Do we provide a callback + options to not allow clicking out?
     * If so, how should we pass around the callback? Seems excessive for not a lot of impact.
     */
    // this.overlay.addEventListener("click", () => {
    //   this.close();
    // });
    // window.addEventListener("keydown", this.onKeyDown);
  }

  // protected onKeyDown = (e: KeyboardEvent) => {
  //   if (e.key === "Escape") {
  //     this.close();
  //   }
  // };

  protected mergeStyles(styles: Partial<ModalStyles>) {
    this.styles.body = {
      ...this.styles.body,
      ...(styles.body || {}),
    };

    this.styles.overlay = {
      ...this.styles.overlay,
      ...(styles.overlay || {}),
    };

    this.styles.main = {
      ...this.styles.main,
      ...(styles.main || {}),
    };

    this.styles.iframe = {
      ...this.styles.iframe,
      ...(styles.iframe || {}),
    };
  }

  protected addAccessibility() {
    this.main.setAttribute('aria-hidden', 'true');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.body.setAttribute('aria-modal', 'true');
    this.body.setAttribute('role', 'dialog');
  }

  protected assignStyles(el: HTMLElement, styles: StyleObject) {
    Object.assign(el.style, styles);
  }
}
