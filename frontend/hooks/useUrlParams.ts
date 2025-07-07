import { useEffect } from "react";

interface UrlParams {
  setRoomId: (value: string) => void;
  setUserName: (value: string) => void;
}

const useUrlParams = ({ setRoomId, setUserName }: UrlParams) => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get("room");
      const nameParam = urlParams.get("name");

      if (roomParam) {
        setRoomId(roomParam);
      }
      if (nameParam) {
        setUserName(decodeURIComponent(nameParam));
      }
    }
  }, [setRoomId, setUserName]);
};

export default useUrlParams;
