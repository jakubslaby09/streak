const errorFooter = document.querySelector<"footer">("body > footer.errors" as any);

export function expect<T>(message: string, callback: () => T): T | null {
    try {
        const res = callback();
        if(res instanceof Promise) {
            return res.catch(error => displayError(message, error)) as T;
        } else {
            return res;
        }
    } catch (error) {
        displayError(message, error);
        return null;
    }
}

export function displayError(message: string, error: unknown) {
    console.error(`${message}: `, error);
    if(errorFooter == null) {
        console.error("missing body > footer.errors");
        return;
    }
    errorFooter.setAttribute("shown", "");
    let errorString: string;
    try {
        errorString = JSON.stringify(error);
    } catch (error) {
        console.error("cannot stringify error: ", error);
        errorString = `${error}`;
    }
    const errorSpan = document.createElement("span");
    errorSpan.innerText = message != "" ? `${message}: ${errorString}` : errorString;
    errorFooter.insertAdjacentElement("afterbegin", errorSpan);
}