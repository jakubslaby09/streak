export class SafetyButton extends HTMLButtonElement {
    constructor(cover: string, label: string) {
        super();
        super.innerText = label;
        super.setAttribute("safety", cover);
        super.addEventListener("focusout", this.cover);
        super.addEventListener("click", this.uncover);
    }

    private isCovered(): boolean {
        return super.getAttribute("open") == null;
    }

    private cover() {
        super.removeAttribute("open");
    }
    
    private uncover() {
        setTimeout(() => super.setAttribute("open", ""), 0);
    }

    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: SafetyButton, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions | undefined): void;
    addEventListener(type: unknown, listener: unknown, options?: unknown): void {
        if(type != "click" as keyof HTMLElementEventMap) {
            return super.addEventListener(type as any, listener as any, options as any);
        }
        if(!(typeof listener == "function")) {
            return super.addEventListener("click", listener as any, options as any);
        }
        super.addEventListener("click", e => {
            if(!this.isCovered()) listener(e);
        }, options as any);
    }
}
customElements.define("safety-button", SafetyButton, {
    extends: "button",
});