export function createState(client) {
  let generation=0;
  const state={value:{items:[],loading:false,error:null},async load(query){
    const current=++generation;state.value={...state.value,loading:true,error:null};
    try {const result=await client.list(query);if(current===generation)state.value={...state.value,...result,loading:false};}
    catch(error){if(current===generation)state.value={...state.value,loading:false,error:error.message};}
  }};return state;
}
