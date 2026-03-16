import { hooks } from 'https://pyscript.net/releases/2026.3.1/core.js'

hooks.worker.onReady.add(({ interpreter, io, run }, { sync }) => {
    interpreter.registerJsModule("_pyscript_positron", {
        server: {"a": 123}
    });

    run(
        [
            "from _pyscript_positron import server",
            "print(server['a'])",
        ].join(";"),
    );
});
