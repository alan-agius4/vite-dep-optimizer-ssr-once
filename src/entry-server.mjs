
      import {something as cjsDepOne} from "cjs-dep-one";
      import {something as cjsDepTwo} from "cjs-dep-two";

      export function render() {
        console.log({
          cjsDepOne,
          cjsDepTwo
        });

        return '';
      }

    